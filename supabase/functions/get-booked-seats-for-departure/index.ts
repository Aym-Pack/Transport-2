import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // departureId refers to the specific instance of a journey, from the 'departures' table.
    // vehicleId is passed to ensure we are checking seats for the correct vehicle on that departure.
    const { departureId, vehicleId } = await req.json();

    if (!departureId || !vehicleId) {
      return new Response(JSON.stringify({ error: 'Missing departureId or vehicleId parameter' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Fetch 'seat_identifier' for all confirmed/reserved seats for this departure and vehicle.
    const { data: bookedSeatsData, error: bookedSeatsError } = await supabaseAdmin
      .from('booked_seats')
      .select('seat_identifier')
      .eq('departure_id', departureId)
      .eq('vehicle_id', vehicleId)
      .in('status', ['confirmed', 'reserved']); // Only count seats that are actually taken or held

    if (bookedSeatsError) throw bookedSeatsError;

    const bookedSeatIdentifiers = bookedSeatsData.map(seat => seat.seat_identifier);

    return new Response(JSON.stringify({ bookedSeats: bookedSeatIdentifiers }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching booked seats:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
