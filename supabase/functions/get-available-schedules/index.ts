import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

interface ScheduleQuery {
  departureLocationName: string;
  arrivalLocationName: string;
  travelDate: string; // YYYY-MM-DD
}

// Helper to get day of the week as text (e.g., 'monday') for schedules table
const getTextDayOfWeek = (dateString: string): string => {
  const date = new Date(dateString);
  // Ensure UTC date components are used to avoid timezone issues if the input date is treated as local
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[utcDate.getUTCDay()];
};

// Helper to get ISO day of the week (Monday=1, Sunday=7) for passenger_tariffs
const getISODayOfWeek = (dateString: string): number => {
  const date = new Date(dateString);
  // Ensure UTC date components are used
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay();
  return day === 0 ? 7 : day; // Adjust Sunday from 0 to 7
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { departureLocationName, arrivalLocationName, travelDate }: ScheduleQuery = await req.json();

    if (!departureLocationName || !arrivalLocationName || !travelDate) {
      return new Response(JSON.stringify({ error: 'Missing required parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // 1. Get location IDs
    const { data: depLocData, error: depLocErr } = await supabaseAdmin
      .from('locations')
      .select('id')
      .eq('name', departureLocationName)
      .single();
    if (depLocErr || !depLocData) throw new Error(`Departure location ${departureLocationName} not found.`);

    const { data: arrLocData, error: arrLocErr } = await supabaseAdmin
      .from('locations')
      .select('id')
      .eq('name', arrivalLocationName)
      .single();
    if (arrLocErr || !arrLocData) throw new Error(`Arrival location ${arrivalLocationName} not found.`);

    const departureLocationId = depLocData.id;
    const arrivalLocationId = arrLocData.id;

    // 2. Get route_id
    const { data: routeData, error: routeErr } = await supabaseAdmin
      .from('routes')
      .select('id') // Removed base_price
      .eq('departure_location_id', departureLocationId)
      .eq('arrival_location_id', arrivalLocationId)
      .single();
    if (routeErr || !routeData) throw new Error(`Route not found for ${departureLocationName} to ${arrivalLocationName}.`);
    const routeId = routeData.id;

    // 3. Determine the day of the week for the travelDate
    const textDay = getTextDayOfWeek(travelDate); // For schedules table (e.g., 'monday')
    const isoDay = getISODayOfWeek(travelDate); // For passenger_tariffs (e.g., 1 for Monday)

    // 4. Fetch schedules matching the route and day of the week,
    //    then join with departures for the specific travelDate.
    //    Also fetch vehicle_id and vehicle_type_id.
    const { data: schedulesData, error: schedulesErr } = await supabaseAdmin
      .from('schedules')
      .select(`
        id,
        departure_time,
        arrival_time,
        vehicle_id,
        vehicles ( id, type, capacity, vehicle_type_id ),
        departures!inner (
          id,
          departure_date,
          status,
          available_seats
        )
      `)
      .eq('route_id', routeId)
      .eq(textDay, true) // e.g., schedules.monday = true
      .eq('departures.departure_date', travelDate)
      .gt('departures.available_seats', 0)
      .neq('departures.status', 'cancelled');

    if (schedulesErr) throw schedulesErr;
    if (!schedulesData || schedulesData.length === 0) {
      return new Response(JSON.stringify([]), { // No schedules found
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 5. For each schedule, find the applicable tariff
    const availableSchedulesWithTariffs = [];
    for (const schedule of schedulesData) {
      if (!schedule.vehicles || !schedule.vehicles.vehicle_type_id) {
        console.warn(`Schedule ${schedule.id} is missing vehicle or vehicle_type_id. Skipping tariff search.`);
        availableSchedulesWithTariffs.push({
          ...schedule,
          price: null, // Or a default price / error indicator
          currency_code: null,
          departure_instance_id: schedule.departures[0]?.id,
        });
        continue;
      }
      const vehicleTypeId = schedule.vehicles.vehicle_type_id;

      // Query passenger_tariffs
      const { data: tariffs, error: tariffError } = await supabaseAdmin
        .from('passenger_tariffs')
        .select('price, currency_code, days_of_week')
        .eq('route_id', routeId)
        .eq('vehicle_type_id', vehicleTypeId)
        .eq('passenger_category', 'ADULT') // Default to ADULT
        .eq('is_active', true)
        .lte('valid_from', travelDate) // Tariff is valid from this date or earlier
        .or(`valid_until.gte.${travelDate},valid_until.is.null`) // Tariff is valid until this date or later, OR no expiry
        .order('created_at', { ascending: false }); // Get the most recently created one if multiple match basic criteria

      if (tariffError) {
        console.error(`Error fetching tariff for schedule ${schedule.id}:`, tariffError.message);
        availableSchedulesWithTariffs.push({
          ...schedule,
          price: null, currency_code: null, departure_instance_id: schedule.departures[0]?.id,
        });
        continue;
      }

      // Filter by days_of_week in Deno code
      const applicableTariff = tariffs?.find(tariff => {
        if (!tariff.days_of_week || tariff.days_of_week.length === 0) return true; // Applies to all days if null/empty
        return tariff.days_of_week.includes(isoDay);
      });

      availableSchedulesWithTariffs.push({
        ...schedule,
        price: applicableTariff ? applicableTariff.price : null,
        currency_code: applicableTariff ? applicableTariff.currency_code : null,
        departure_instance_id: schedule.departures[0]?.id,
      });
    }

    return new Response(JSON.stringify(availableSchedulesWithTariffs), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching available schedules:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
