import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const vehicleId = url.searchParams.get('id')

    switch (req.method) {
      case 'POST': { // Create
        const {
          registration_number,
          vehicle_type_id,
          make,
          model,
          year_of_manufacture,
          assigned_agency_id,
          status,
          last_maintenance_date,
          next_maintenance_due_date,
        } = await req.json()

        if (!registration_number || !vehicle_type_id) {
          return new Response(JSON.stringify({ error: 'Missing required fields: registration_number, vehicle_type_id' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data, error } = await supabaseAdmin
          .from('vehicles')
          .insert([{
            registration_number,
            vehicle_type_id,
            make,
            model,
            year_of_manufacture,
            assigned_agency_id,
            status,
            last_maintenance_date,
            next_maintenance_due_date,
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
        let query = supabaseAdmin.from('vehicles').select('*, vehicle_types(*), agencies(*)') // Example of joining

        if (vehicleId) { // Get by ID
          query = query.eq('id', vehicleId).single()
        } else { // List all, potentially filtered
          const statusFilter = url.searchParams.get('status')
          const vehicleTypeIdFilter = url.searchParams.get('vehicle_type_id')
          const agencyIdFilter = url.searchParams.get('assigned_agency_id')

          if (statusFilter) query = query.eq('status', statusFilter)
          if (vehicleTypeIdFilter) query = query.eq('vehicle_type_id', vehicleTypeIdFilter)
          if (agencyIdFilter) query = query.eq('assigned_agency_id', agencyIdFilter)

          query = query.order('registration_number')
        }

        const { data, error } = await query

        if (error) {
          if (error.code === 'PGRST116' && vehicleId) {
            return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
          }
          throw error
        }
         if (vehicleId && !data) {
             return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
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
        if (!vehicleId) {
          return new Response(JSON.stringify({ error: 'Vehicle ID is required for update' }), {
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
          .from('vehicles')
          .update(body)
          .eq('id', vehicleId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                });
            }
            throw error
        }
        if (!data) {
            return new Response(JSON.stringify({ error: 'Vehicle not found or no changes made' }), {
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
        if (!vehicleId) {
          return new Response(JSON.stringify({ error: 'Vehicle ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data: existingVehicle, error: fetchError } = await supabaseAdmin
            .from('vehicles')
            .select('id')
            .eq('id', vehicleId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        if (!existingVehicle && !fetchError) {
             return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from('vehicles')
          .delete()
          .eq('id', vehicleId)

        if (error) {
          if (error.code === '23503') { // foreign_key_violation
             return new Response(JSON.stringify({ error: 'Cannot delete vehicle: it is being used by other records (e.g., schedules).' }), {
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
