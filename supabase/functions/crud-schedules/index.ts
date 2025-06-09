import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const TABLE_NAME = 'schedules'
const ROUTES_TABLE = 'routes'
const VEHICLE_TYPES_TABLE = 'vehicle_types'
const VEHICLES_TABLE = 'vehicles'


interface ScheduleValidationError {
  field: string;
  message: string;
}

async function validateScheduleData(body: any, isUpdate = false): Promise<ScheduleValidationError[]> {
  const errors: ScheduleValidationError[] = [];

  if (!isUpdate) { // Fields required for creation
    if (!body.route_id) errors.push({ field: 'route_id', message: 'Route is required.' });
    if (!body.departure_time) errors.push({ field: 'departure_time', message: 'Departure time is required.' });
    if (!body.arrival_time) errors.push({ field: 'arrival_time', message: 'Arrival time is required.' });
    if (!body.days_of_operation || !Array.isArray(body.days_of_operation) || body.days_of_operation.length === 0) {
      errors.push({ field: 'days_of_operation', message: 'Days of operation are required.' });
    }
    if (!body.default_vehicle_type_id) errors.push({ field: 'default_vehicle_type_id', message: 'Default vehicle type is required.' });
  }

  if (body.route_id) {
    const { data, error } = await supabaseAdmin.from(ROUTES_TABLE).select('id').eq('id', body.route_id).maybeSingle();
    if (error || !data) errors.push({ field: 'route_id', message: `Route with ID ${body.route_id} not found.` });
  }
  if (body.default_vehicle_type_id) {
    const { data, error } = await supabaseAdmin.from(VEHICLE_TYPES_TABLE).select('id').eq('id', body.default_vehicle_type_id).maybeSingle();
    if (error || !data) errors.push({ field: 'default_vehicle_type_id', message: `Vehicle Type with ID ${body.default_vehicle_type_id} not found.` });
  }
  if (body.vehicle_id) { // Optional
    const { data, error } = await supabaseAdmin.from(VEHICLES_TABLE).select('id').eq('id', body.vehicle_id).maybeSingle();
    if (error || !data) errors.push({ field: 'vehicle_id', message: `Vehicle with ID ${body.vehicle_id} not found.` });
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format
  if (body.departure_time && !timeRegex.test(body.departure_time)) {
    errors.push({ field: 'departure_time', message: 'Invalid departure time format. Use HH:MM.' });
  }
  if (body.arrival_time && !timeRegex.test(body.arrival_time)) {
    errors.push({ field: 'arrival_time', message: 'Invalid arrival time format. Use HH:MM.' });
  }
  // Consider validating arrival_time is after departure_time if they are on the same day,
  // or handle multi-day schedules if applicable (though current schema doesn't explicitly support this easily).

  if (body.days_of_operation && Array.isArray(body.days_of_operation)) {
    if (!body.days_of_operation.every((day: any) => typeof day === 'number' && day >= 1 && day <= 7)) {
      errors.push({ field: 'days_of_operation', message: 'Days of operation must be an array of numbers between 1 (Monday) and 7 (Sunday).' });
    }
  } else if (body.days_of_operation !== undefined && !isUpdate) { // Only error if present and invalid, or required and missing
     errors.push({ field: 'days_of_operation', message: 'Days of operation must be an array.' });
  }


  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.push({ field: 'is_active', message: 'Is Active must be a boolean.' });
  }

  return errors;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const scheduleId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null; // Assuming ID is BIGSERIAL

    switch (req.method) {
      case 'POST': {
        const body = await req.json()
        const validationErrors = await validateScheduleData(body);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }

        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .insert([body])
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      case 'GET': {
        let query = supabaseAdmin
          .from(TABLE_NAME)
          .select(`
            *,
            route:routes!inner(name),
            default_vehicle_type:vehicle_types!inner(name),
            assigned_vehicle:vehicles(registration_number)
          `)

        if (scheduleId) {
          query = query.eq('id', scheduleId).single()
        } else {
          if (url.searchParams.has('route_id')) query = query.eq('route_id', url.searchParams.get('route_id'))
          if (url.searchParams.has('is_active')) query = query.eq('is_active', url.searchParams.get('is_active') === 'true')
          // To order by route name, we need a way to reference the joined table's column.
          // This might require a view or more complex query if direct ordering on joined column name isn't straightforward.
          // For now, ordering by own columns.
          query = query.order('route_id').order('departure_time')
        }

        const { data, error } = await query

        if (error) {
            if (error.code === 'PGRST116' && scheduleId) {
                return new Response(JSON.stringify({ error: 'Schedule not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (scheduleId && !data) {
            return new Response(JSON.stringify({ error: 'Schedule not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'PUT': {
        if (!scheduleId) {
          return new Response(JSON.stringify({ error: 'Schedule ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        const body = await req.json()
        // Prevent updating FKs like route_id directly if that's a business rule, or validate them.
        // For this implementation, we allow updating them but they must exist.
        const validationErrors = await validateScheduleData(body, true);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }

        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .update(body)
          .eq('id', scheduleId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Schedule not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (!data) {
             return new Response(JSON.stringify({ error: 'Schedule not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'DELETE': {
        if (!scheduleId) {
          return new Response(JSON.stringify({ error: 'Schedule ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }

        const { data: existing, error: fetchError } = await supabaseAdmin.from(TABLE_NAME).select('id').eq('id', scheduleId).single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        if (!existing) {
             return new Response(JSON.stringify({ error: 'Schedule not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from(TABLE_NAME)
          .delete()
          .eq('id', scheduleId)

        if (error) {
            if (error.code === '23503') { // foreign_key_violation (e.g., linked departures)
                return new Response(JSON.stringify({ error: 'Cannot delete schedule: It is currently in use by active departures or other linked records.' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409, // Conflict
                });
            }
            throw error;
        }
        return new Response(JSON.stringify({message: "Schedule deleted successfully"}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      default:
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
        })
    }
  } catch (error) {
    console.error('Error processing schedule request:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || (error.message?.includes('not found') ? 404 : 500),
    });
  }
})
