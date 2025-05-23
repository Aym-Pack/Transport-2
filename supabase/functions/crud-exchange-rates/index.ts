import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const rateId = url.searchParams.get('id')
    const sourceCurrencyCode = url.searchParams.get('source_currency_code')
    const targetCurrencyCode = url.searchParams.get('target_currency_code')


    switch (req.method) {
      case 'POST': { // Create
        const { source_currency_code, target_currency_code, rate, source_of_rate } = await req.json()
        if (!source_currency_code || !target_currency_code || rate === undefined) {
          return new Response(JSON.stringify({ error: 'Missing required fields: source_currency_code, target_currency_code, rate' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const { data, error } = await supabaseAdmin
          .from('exchange_rates')
          .insert([{ source_currency_code, target_currency_code, rate, source_of_rate, last_updated_at: new Date().toISOString() }])
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        })
      }

      case 'GET': { // Read
        let query = supabaseAdmin.from('exchange_rates').select('*')

        if (rateId) { // Get by ID
          query = query.eq('id', rateId).single()
        } else { // List all, potentially filtered
          if (sourceCurrencyCode) {
            query = query.eq('source_currency_code', sourceCurrencyCode)
          }
          if (targetCurrencyCode) {
            query = query.eq('target_currency_code', targetCurrencyCode)
          }
          query = query.order('id')
        }

        const { data, error } = await query

        if (error) {
          // If .single() was used and no row found, PGRST116 is returned
          if (error.code === 'PGRST116' && rateId) {
            return new Response(JSON.stringify({ error: 'Exchange rate not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
          }
          throw error
        }
        
        if (rateId && !data) { // Should be caught by PGRST116, but as a safeguard
             return new Response(JSON.stringify({ error: 'Exchange rate not found' }), {
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
        if (!rateId) {
          return new Response(JSON.stringify({ error: 'Exchange rate ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const { rate, source_of_rate } = await req.json()
        if (rate === undefined && source_of_rate === undefined) {
          return new Response(JSON.stringify({ error: 'Missing fields to update: rate or source_of_rate' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const updatePayload: { rate?: number; source_of_rate?: string, last_updated_at: string } = {
            last_updated_at: new Date().toISOString()
        }
        if (rate !== undefined) updatePayload.rate = rate
        if (source_of_rate !== undefined) updatePayload.source_of_rate = source_of_rate

        const { data, error } = await supabaseAdmin
          .from('exchange_rates')
          .update(updatePayload)
          .eq('id', rateId)
          .select()
          .single()

        if (error) {
             if (error.code === 'PGRST116') { // No row found for update
                return new Response(JSON.stringify({ error: 'Exchange rate not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                });
            }
            throw error
        }
         if (!data) { // Should be caught by PGRST116, but as a safeguard
            return new Response(JSON.stringify({ error: 'Exchange rate not found or no changes made' }), {
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
        if (!rateId) {
          return new Response(JSON.stringify({ error: 'Exchange rate ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        // Check if rate exists before deleting
        const { data: existingRate, error: fetchError } = await supabaseAdmin
            .from('exchange_rates')
            .select('id')
            .eq('id', rateId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        if (!existingRate && !fetchError) {
             return new Response(JSON.stringify({ error: 'Exchange rate not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }
        
        const { error } = await supabaseAdmin
          .from('exchange_rates')
          .delete()
          .eq('id', rateId)

        if (error) throw error // FK constraints are not expected on exchange_rates deletion usually
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
