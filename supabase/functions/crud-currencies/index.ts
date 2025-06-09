import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const currencyCode = url.searchParams.get('code')

    switch (req.method) {
      case 'POST': { // Create
        const { code, name, symbol } = await req.json()
        if (!code || !name) {
          return new Response(JSON.stringify({ error: 'Missing required fields: code, name' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const { data, error } = await supabaseAdmin
          .from('currencies')
          .insert([{ code, name, symbol }])
          .select()
          .single() // Assuming you want to return the created object

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        })
      }

      case 'GET': { // Read
        if (currencyCode) { // Get by code
          const { data, error } = await supabaseAdmin
            .from('currencies')
            .select('*')
            .eq('code', currencyCode)
            .single()
          if (error) throw error
          if (!data) {
            return new Response(JSON.stringify({ error: 'Currency not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
          }
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        } else { // List all
          const { data, error } = await supabaseAdmin.from('currencies').select('*').order('code')
          if (error) throw error
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        }
      }

      case 'PUT': { // Update
        if (!currencyCode) {
          return new Response(JSON.stringify({ error: 'Currency code is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const { name, symbol } = await req.json()
        if (!name && !symbol) {
          return new Response(JSON.stringify({ error: 'Missing fields to update: name or symbol' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const updatePayload: { name?: string; symbol?: string } = {}
        if (name) updatePayload.name = name
        if (symbol) updatePayload.symbol = symbol

        const { data, error } = await supabaseAdmin
          .from('currencies')
          .update(updatePayload)
          .eq('code', currencyCode)
          .select()
          .single()

        if (error) throw error
        if (!data) {
            return new Response(JSON.stringify({ error: 'Currency not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404, // Or 200 if no change is not an error
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      case 'DELETE': { // Delete
        if (!currencyCode) {
          return new Response(JSON.stringify({ error: 'Currency code is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        // Check if currency exists before deleting
        const { data: existingCurrency, error: fetchError } = await supabaseAdmin
            .from('currencies')
            .select('code')
            .eq('code', currencyCode)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: "Exact one row not found" - this is okay if we are about to delete
            throw fetchError;
        }
        if (!existingCurrency && !fetchError) { // No error but no currency means it was not found
             return new Response(JSON.stringify({ error: 'Currency not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }


        const { error } = await supabaseAdmin
          .from('currencies')
          .delete()
          .eq('code', currencyCode)

        if (error) {
          // Basic check for foreign key violation, more specific error handling might be needed
          if (error.code === '23503') { // foreign_key_violation
             return new Response(JSON.stringify({ error: 'Cannot delete currency: it is being used by other records (e.g., agencies, exchange_rates).' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 409, // Conflict
            });
          }
          throw error;
        }
        return new Response(null, { // Or JSON.stringify({ message: 'Currency deleted successfully' })
          headers: { ...corsHeaders },
          status: 204, // No Content
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
      status: error.status || 500, // Use error.status if available, otherwise default to 500
    })
  }
})
