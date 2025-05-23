import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const vehicleTypeId = url.searchParams.get('id')

    switch (req.method) {
      case 'POST': { // Create
        const {
          name,
          capacity_passengers,
          capacity_cargo_kg,
          description,
          is_passenger_vehicle,
          is_cargo_vehicle,
        } = await req.json()

        if (!name) {
          return new Response(JSON.stringify({ error: 'Missing required field: name' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data, error } = await supabaseAdmin
          .from('vehicle_types')
          .insert([{
            name,
            capacity_passengers,
            capacity_cargo_kg,
            description,
            is_passenger_vehicle,
            is_cargo_vehicle,
          }])
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        })
      }

      case 'GET': { // Read
        let query = supabaseAdmin.from('vehicle_types').select('*')

        if (vehicleTypeId) { // Get by ID
          query = query.eq('id', vehicleTypeId).single()
        } else { // List all
          query = query.order('name')
        }

        const { data, error } = await query

        if (error) {
          if (error.code === 'PGRST116' && vehicleTypeId) {
            return new Response(JSON.stringify({ error: 'Vehicle type not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
          }
          throw error
        }
        if (vehicleTypeId && !data) {
             return new Response(JSON.stringify({ error: 'Vehicle type not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      case 'PUT': { // Update
        if (!vehicleTypeId) {
          return new Response(JSON.stringify({ error: 'Vehicle type ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const body = await req.json()
        delete body.id
        delete body.created_at

        if (Object.keys(body).length === 0) {
          return new Response(JSON.stringify({ error: 'No fields to update provided' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data, error } = await supabaseAdmin
          .from('vehicle_types')
          .update(body)
          .eq('id', vehicleTypeId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Vehicle type not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                });
            }
            throw error
        }
         if (!data) {
            return new Response(JSON.stringify({ error: 'Vehicle type not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      case 'DELETE': { // Delete
        if (!vehicleTypeId) {
          return new Response(JSON.stringify({ error: 'Vehicle type ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data: existingType, error: fetchError } = await supabaseAdmin
            .from('vehicle_types')
            .select('id')
            .eq('id', vehicleTypeId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        if (!existingType && !fetchError) {
             return new Response(JSON.stringify({ error: 'Vehicle type not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from('vehicle_types')
          .delete()
          .eq('id', vehicleTypeId)

        if (error) {
          if (error.code === '23503') { // foreign_key_violation
             return new Response(JSON.stringify({ error: 'Cannot delete vehicle type: it is being used by other records (e.g., vehicles, schedules).' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 409, // Conflict
            });
          }
          throw error;
        }
        return new Response(null, {
          headers: { ...corsHeaders },
          status: 204,
        })
      }

      default:
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 405,
        })
    }
  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || 500,
    })
  }
})
