import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const DEPARTURES_TABLE = 'departures'
const SCHEDULES_TABLE = 'schedules'
const DEPARTURE_CREW_TABLE = 'departure_crew'
const STAFF_MEMBERS_TABLE = 'staff_members'
const VEHICLES_TABLE = 'vehicles'
// const ROUTES_TABLE = 'routes' // For joining through schedules

const DEPARTURE_STATUS_ENUM = ['SCHEDULED', 'BOARDING', 'DEPARTED', 'ARRIVED', 'CANCELLED', 'DELAYED', 'POSTPONED'];

interface DepartureValidationError {
  field: string;
  message: string;
}

async function validateDepartureData(body: any, isUpdate = false): Promise<DepartureValidationError[]> {
  const errors: DepartureValidationError[] = [];

  if (!isUpdate) { // Fields required for creation
    if (!body.schedule_id) errors.push({ field: 'schedule_id', message: 'Schedule ID is required.' });
    if (!body.departure_date) errors.push({ field: 'departure_date', message: 'Departure date is required.' });
    // planned_departure_time and planned_arrival_time are derived from schedule
  }

  if (body.schedule_id) {
    const { data: schedule, error } = await supabaseAdmin.from(SCHEDULES_TABLE).select('id').eq('id', body.schedule_id).maybeSingle();
    if (error || !schedule) errors.push({ field: 'schedule_id', message: `Schedule with ID ${body.schedule_id} not found.` });
  }
  if (body.departure_date && !/^\d{4}-\d{2}-\d{2}$/.test(body.departure_date)) {
    errors.push({ field: 'departure_date', message: 'Invalid departure date format. Use YYYY-MM-DD.' });
  }
  if (body.assigned_vehicle_id) {
    const { data: vehicle, error } = await supabaseAdmin.from(VEHICLES_TABLE).select('id').eq('id', body.assigned_vehicle_id).maybeSingle();
    if (error || !vehicle) errors.push({ field: 'assigned_vehicle_id', message: `Assigned vehicle with ID ${body.assigned_vehicle_id} not found.` });
  }
  if (body.status && !DEPARTURE_STATUS_ENUM.includes(body.status)) {
    errors.push({ field: 'status', message: `Invalid status. Must be one of: ${DEPARTURE_STATUS_ENUM.join(', ')}.` });
  }
  // Validate actual_departure_time and actual_arrival_time if provided (should be ISO strings)
  if (body.actual_departure_time && isNaN(new Date(body.actual_departure_time).getTime())) {
    errors.push({ field: 'actual_departure_time', message: 'Invalid actual departure time format.' });
  }
  if (body.actual_arrival_time && isNaN(new Date(body.actual_arrival_time).getTime())) {
    errors.push({ field: 'actual_arrival_time', message: 'Invalid actual arrival time format.' });
  }

  if (body.crew_assignments && !Array.isArray(body.crew_assignments)) {
    errors.push({ field: 'crew_assignments', message: 'Crew assignments must be an array.'});
  } else if (body.crew_assignments) {
    for (const assignment of body.crew_assignments) {
        if (!assignment.staff_member_id) errors.push({ field: 'crew_assignments.staff_member_id', message: 'Each crew assignment must have a staff_member_id.'});
        if (!assignment.assigned_role_in_departure) errors.push({ field: 'crew_assignments.assigned_role_in_departure', message: 'Each crew assignment must have an assigned_role_in_departure.'});
        // Could also validate existence of staff_member_id here
    }
  }

  return errors;
}

function parseDepartureDbErrorMessage(dbError: any): DepartureValidationError[] {
    if (dbError.code === '23505') { // unique_violation
        if (dbError.constraint === 'departures_schedule_id_departure_date_planned_departure_tim_key') { // Check constraint name
            return [{ field: 'form', message: 'A departure for this schedule on this date and time already exists.' }];
        }
        return [{ field: 'form', message: 'A departure with similar unique properties already exists.' }];
    }
    if (dbError.code === '23503') { // foreign key violation
        if (dbError.message.includes('departures_schedule_id_fkey')) {
             return [{ field: 'schedule_id', message: 'Schedule ID does not exist.' }];
        }
         if (dbError.message.includes('departures_assigned_vehicle_id_fkey')) {
             return [{ field: 'assigned_vehicle_id', message: 'Assigned Vehicle ID does not exist.' }];
        }
    }
    return [{ field: 'database', message: dbError.message || 'A database error occurred.' }];
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const departureId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null;

    // Special endpoint for setting crew
    if (req.method === 'PUT' && url.pathname.endsWith('/set-crew')) {
      if (!departureId) {
        return new Response(JSON.stringify({ error: 'Departure ID is required for setting crew' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        })
      }
      const { crew_assignments } = await req.json();
      if (!Array.isArray(crew_assignments)) {
        return new Response(JSON.stringify({ error: 'crew_assignments must be an array' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
        })
      }
      // Validate each assignment (basic check)
      for (const assignment of crew_assignments) {
        if (!assignment.staff_member_id || !assignment.assigned_role_in_departure) {
           return new Response(JSON.stringify({ error: 'Each crew assignment needs staff_member_id and assigned_role_in_departure.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        // Could add validation for staff_member_id existence here
      }

      // "Transaction": Delete old, then insert new
      const { error: deleteError } = await supabaseAdmin.from(DEPARTURE_CREW_TABLE).delete().eq('departure_id', departureId);
      if (deleteError) throw deleteError;

      let newCrewData: any[] = [];
      if (crew_assignments.length > 0) {
        const newCrew = crew_assignments.map(ca => ({
          departure_id: departureId,
          staff_member_id: ca.staff_member_id,
          assigned_role_in_departure: ca.assigned_role_in_departure,
        }));
        const { data, error: insertError } = await supabaseAdmin.from(DEPARTURE_CREW_TABLE).insert(newCrew).select('*, staff_member:staff_members(first_name, last_name, staff_type)');
        if (insertError) throw insertError;
        newCrewData = data || [];
      }
      return new Response(JSON.stringify({ message: 'Crew updated successfully', crew: newCrewData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
      });
    }


    // Standard CRUD for departures
    switch (req.method) {
      case 'POST': {
        let body = await req.json()
        const validationErrors = await validateDepartureData(body);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }

        // Fetch schedule to get times and default vehicle
        const { data: schedule, error: scheduleError } = await supabaseAdmin
          .from(SCHEDULES_TABLE)
          .select('departure_time, arrival_time, vehicle_id')
          .eq('id', body.schedule_id)
          .single();
        if (scheduleError || !schedule) {
          return new Response(JSON.stringify({ errors: [{field: 'schedule_id', message: `Schedule with ID ${body.schedule_id} not found.`}] }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400, // Or 404 if preferred
          })
        }

        const departurePayload: any = {
          schedule_id: body.schedule_id,
          departure_date: body.departure_date,
          planned_departure_time: schedule.departure_time,
          planned_arrival_time: schedule.arrival_time,
          assigned_vehicle_id: body.assigned_vehicle_id || schedule.vehicle_id || null,
          status: body.status || 'SCHEDULED',
          notes: body.notes,
        };

        const { data: departureData, error: departureError } = await supabaseAdmin
          .from(DEPARTURES_TABLE)
          .insert([departurePayload])
          .select() // Select all from departure
          .single()

        if (departureError) {
            const parsedErrors = parseDepartureDbErrorMessage(departureError);
            return new Response(JSON.stringify({ errors: parsedErrors }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: departureError.code === '23505' ? 409 : 500,
            });
        }
        if (!departureData) throw new Error("Failed to create departure, no data returned.");

        // Handle crew assignments if provided
        let crewData: any[] = [];
        if (body.crew_assignments && Array.isArray(body.crew_assignments) && body.crew_assignments.length > 0) {
            const assignmentsToInsert = body.crew_assignments.map((ca: any) => ({
                departure_id: departureData.id,
                staff_member_id: ca.staff_member_id,
                assigned_role_in_departure: ca.assigned_role_in_departure,
            }));
            const { data: insertedCrew, error: crewError } = await supabaseAdmin
                .from(DEPARTURE_CREW_TABLE)
                .insert(assignmentsToInsert)
                .select('*, staff_member:staff_members(first_name, last_name, staff_type)');
            if (crewError) {
                // Consider deleting the departure if crew assignment fails for atomicity
                console.error("Failed to assign crew, but departure was created:", crewError);
                // For now, we'll return the departure but note the crew failure.
                // A more robust solution might use a DB transaction via a pg function.
            } else {
                crewData = insertedCrew || [];
            }
        }

        return new Response(JSON.stringify({ ...departureData, crew: crewData }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      case 'GET': {
        let query = supabaseAdmin
          .from(DEPARTURES_TABLE)
          .select(`
            *,
            schedule:schedules!inner (
                id, notes, is_active, departure_time, arrival_time,
                route:routes!inner (id, name, start_city, end_city),
                default_vehicle_type:vehicle_types!inner (id, name)
            ),
            assigned_vehicle:vehicles (id, registration_number, make, model),
            departure_crew:departure_crew!left (
                id, assigned_role_in_departure,
                staff_member:staff_members!inner (id, first_name, last_name, staff_type)
            )
          `)

        if (departureId) {
          query = query.eq('id', departureId).single()
        } else {
          // Filtering
          if (url.searchParams.has('departure_date')) query = query.eq('departure_date', url.searchParams.get('departure_date'))
          if (url.searchParams.has('status')) query = query.eq('status', url.searchParams.get('status'))
          if (url.searchParams.has('schedule_id')) query = query.eq('schedule_id', url.searchParams.get('schedule_id'))
          if (url.searchParams.has('assigned_vehicle_id')) query = query.eq('assigned_vehicle_id', url.searchParams.get('assigned_vehicle_id'))
          // Filtering by route_id via schedule:
          if (url.searchParams.has('route_id')) query = query.eq('schedule.route_id', url.searchParams.get('route_id'))

          query = query.order('departure_date').order('planned_departure_time')
        }

        const { data, error } = await query

        if (error) {
            if (error.code === 'PGRST116' && departureId) {
                return new Response(JSON.stringify({ error: 'Departure not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (departureId && !data) {
            return new Response(JSON.stringify({ error: 'Departure not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'PUT': { // Update Departure (excluding crew, use /set-crew for that)
        if (!departureId) {
          return new Response(JSON.stringify({ error: 'Departure ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        const body = await req.json()
        // schedule_id should not be updatable. If it needs to change, it's a new departure.
        if (body.schedule_id) delete body.schedule_id;
        if (body.departure_date) { // If date changes, planned times might need re-eval, but they are stored.
            // The current schema stores planned times directly.
        }
        if (body.crew_assignments) delete body.crew_assignments; // Use /set-crew

        const validationErrors = await validateDepartureData(body, true);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }

        const { data, error } = await supabaseAdmin
          .from(DEPARTURES_TABLE)
          .update(body)
          .eq('id', departureId)
          .select(`
            *,
            schedule:schedules!inner (route:routes!inner(name)),
            assigned_vehicle:vehicles (registration_number),
            departure_crew:departure_crew!left (staff_member:staff_members!inner(first_name, last_name))
          `) // Fetch updated with some details
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Departure not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            const parsedErrors = parseDepartureDbErrorMessage(error); // For unique constraint on update if any
            return new Response(JSON.stringify({ errors: parsedErrors }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.code === '23505' ? 409 : 500,
            });
        }
        if (!data) {
             return new Response(JSON.stringify({ error: 'Departure not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'DELETE': {
        if (!departureId) {
          return new Response(JSON.stringify({ error: 'Departure ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }

        const { data: existing, error: fetchError } = await supabaseAdmin.from(DEPARTURES_TABLE).select('id').eq('id', departureId).single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        if (!existing) {
             return new Response(JSON.stringify({ error: 'Departure not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from(DEPARTURES_TABLE)
          .delete()
          .eq('id', departureId)

        if (error) throw error // ON DELETE CASCADE handles departure_crew
        return new Response(JSON.stringify({message: "Departure deleted successfully"}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      default:
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
        })
    }
  } catch (error) {
    console.error('Error processing departure request:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || (error.message?.includes('not found') ? 404 : 500),
    });
  }
})
