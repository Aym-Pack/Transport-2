import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const agencyId = url.searchParams.get('id')

    switch (req.method) {
      case 'POST': { // Create
        const {
          name,
          operational_currency_code,
          address,
          city,
          country_code,
          phone_number,
          email,
          is_active,
        } = await req.json()

        if (!name || !operational_currency_code) {
          return new Response(JSON.stringify({ error: 'Missing required fields: name, operational_currency_code' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data, error } = await supabaseAdmin
          .from('agencies')
          .insert([{
            name,
            operational_currency_code,
            address,
            city,
            country_code,
            phone_number,
            email,
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
        let query = supabaseAdmin.from('agencies').select('*')

        if (agencyId) { // Get by ID
          query = query.eq('id', agencyId).single()
        } else { // List all, potentially filtered
          const isActiveFilter = url.searchParams.get('is_active')
          if (isActiveFilter !== null) {
            query = query.eq('is_active', isActiveFilter === 'true')
          }
          query = query.order('name')
        }

        const { data, error } = await query

        if (error) {
          if (error.code === 'PGRST116' && agencyId) {
            return new Response(JSON.stringify({ error: 'Agency not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
          }
          throw error
        }
        if (agencyId && !data) {
             return new Response(JSON.stringify({ error: 'Agency not found' }), {
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
        if (!agencyId) {
          return new Response(JSON.stringify({ error: 'Agency ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const body = await req.json()
        // Ensure no attempt to update primary key or created_at/updated_at directly
        delete body.id
        delete body.created_at
        // updated_at is handled by trigger

        if (Object.keys(body).length === 0) {
          return new Response(JSON.stringify({ error: 'No fields to update provided' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data, error } = await supabaseAdmin
          .from('agencies')
          .update(body)
          .eq('id', agencyId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') { // No row found for update
                return new Response(JSON.stringify({ error: 'Agency not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                });
            }
            throw error
        }
        if (!data) {
            return new Response(JSON.stringify({ error: 'Agency not found or no changes made' }), {
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
        if (!agencyId) {
          return new Response(JSON.stringify({ error: 'Agency ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data: existingAgency, error: fetchError } = await supabaseAdmin
            .from('agencies')
            .select('id')
            .eq('id', agencyId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        if (!existingAgency && !fetchError) {
             return new Response(JSON.stringify({ error: 'Agency not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from('agencies')
          .delete()
          .eq('id', agencyId)

        if (error) {
          // Basic check for foreign key violation
          if (error.code === '23503') {
             return new Response(JSON.stringify({ error: 'Cannot delete agency: it is being used by other records (e.g., vehicles).' }), {
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
