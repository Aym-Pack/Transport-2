import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const routeId = url.searchParams.get('id')

    switch (req.method) {
      case 'POST': { // Create
        const {
          name,
          start_city,
          end_city,
          average_duration_minutes,
          distance_km,
          stops_details,
          is_active,
        } = await req.json()

        if (!name || !start_city || !end_city) {
          return new Response(JSON.stringify({ error: 'Missing required fields: name, start_city, end_city' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data, error } = await supabaseAdmin
          .from('routes')
          .insert([{
            name,
            start_city,
            end_city,
            average_duration_minutes,
            distance_km,
            stops_details,
            is_active,
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
        let query = supabaseAdmin.from('routes').select('*')

        if (routeId) { // Get by ID
          query = query.eq('id', routeId).single()
        } else { // List all, potentially filtered
          const isActiveFilter = url.searchParams.get('is_active')
          if (isActiveFilter !== null) {
            query = query.eq('is_active', isActiveFilter === 'true')
          }
          query = query.order('name')
        }

        const { data, error } = await query

        if (error) {
          if (error.code === 'PGRST116' && routeId) {
            return new Response(JSON.stringify({ error: 'Route not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
          }
          throw error
        }
        if (routeId && !data) {
             return new Response(JSON.stringify({ error: 'Route not found' }), {
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
        if (!routeId) {
          return new Response(JSON.stringify({ error: 'Route ID is required for update' }), {
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
          .from('routes')
          .update(body)
          .eq('id', routeId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Route not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                });
            }
            throw error
        }
         if (!data) {
            return new Response(JSON.stringify({ error: 'Route not found or no changes made' }), {
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
        if (!routeId) {
          return new Response(JSON.stringify({ error: 'Route ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data: existingRoute, error: fetchError } = await supabaseAdmin
            .from('routes')
            .select('id')
            .eq('id', routeId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        if (!existingRoute && !fetchError) {
             return new Response(JSON.stringify({ error: 'Route not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from('routes')
          .delete()
          .eq('id', routeId)

        if (error) {
          if (error.code === '23503') { // foreign_key_violation
             return new Response(JSON.stringify({ error: 'Cannot delete route: it is being used by other records (e.g., schedules).' }), {
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
