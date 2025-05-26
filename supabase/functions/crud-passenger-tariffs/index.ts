import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const TABLE_NAME = 'passenger_tariffs'

// Helper to validate date strings (YYYY-MM-DD)
function isValidDate(dateString: string | null | undefined): boolean {
  if (!dateString) return true; // Optional dates are valid if not provided
  return /^\d{4}-\d{2}-\d{2}$/.test(dateString) && !isNaN(new Date(dateString).getTime());
}

// Helper to validate days_of_week
function isValidDaysOfWeek(days: any[] | null | undefined): boolean {
  if (!days) return true; // Optional
  return Array.isArray(days) && days.every(d => typeof d === 'number' && d >= 1 && d <= 7);
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const tariffId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null;

    switch (req.method) {
      case 'POST': { // Create Tariff
        const body = await req.json()
        const {
          name, passenger_category, price, currency_code, // Required
          route_id, vehicle_type_id, valid_from, valid_until, days_of_week, is_active, notes
        } = body

        if (!name || !passenger_category || price === undefined || !currency_code) {
          return new Response(JSON.stringify({ error: 'Missing required fields: name, passenger_category, price, currency_code' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        if (typeof price !== 'number' || price < 0) {
          return new Response(JSON.stringify({ error: 'Price must be a non-negative number.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        if (!isValidDate(valid_from) || !isValidDate(valid_until)) {
            return new Response(JSON.stringify({ error: 'Invalid date format for valid_from or valid_until. Use YYYY-MM-DD.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        if (valid_from && valid_until && new Date(valid_from) > new Date(valid_until)) {
            return new Response(JSON.stringify({ error: 'valid_from date cannot be after valid_until date.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        if (!isValidDaysOfWeek(days_of_week)) {
            return new Response(JSON.stringify({ error: 'days_of_week must be an array of numbers (1-7).' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }


        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .insert([{
            name, route_id, vehicle_type_id, passenger_category, price, currency_code,
            valid_from, valid_until, days_of_week, is_active, notes
          }])
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      case 'GET': { // Read Tariff(s)
        let query = supabaseAdmin
          .from(TABLE_NAME)
          .select(`
            *,
            routes (name),
            vehicle_types (name),
            currencies (name, symbol)
          `)

        if (tariffId) { // Get by ID
          query = query.eq('id', tariffId).single()
        } else { // List all, potentially filtered
          if (url.searchParams.has('route_id')) query = query.eq('route_id', url.searchParams.get('route_id'))
          if (url.searchParams.has('vehicle_type_id')) query = query.eq('vehicle_type_id', url.searchParams.get('vehicle_type_id'))
          if (url.searchParams.has('passenger_category')) query = query.eq('passenger_category', url.searchParams.get('passenger_category'))
          if (url.searchParams.has('is_active')) query = query.eq('is_active', url.searchParams.get('is_active') === 'true')
          
          query = query.order('name')
        }

        const { data, error } = await query
        
        if (error) {
            if (error.code === 'PGRST116' && tariffId) { // Not found for single GET
                return new Response(JSON.stringify({ error: 'Tariff not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (tariffId && !data) { // Safeguard for single GET
            return new Response(JSON.stringify({ error: 'Tariff not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'PUT': { // Update Tariff
        if (!tariffId) {
          return new Response(JSON.stringify({ error: 'Tariff ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        const body = await req.json()
        const { price, valid_from, valid_until, days_of_week, ...otherUpdates } = body;

        const updatePayload: Record<string, any> = { ...otherUpdates };

        if (price !== undefined) {
            if (typeof price !== 'number' || price < 0) {
                return new Response(JSON.stringify({ error: 'Price must be a non-negative number.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
                })
            }
            updatePayload.price = price;
        }
        if (valid_from !== undefined) {
            if (!isValidDate(valid_from)) {
                return new Response(JSON.stringify({ error: 'Invalid date format for valid_from. Use YYYY-MM-DD.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
                })
            }
            updatePayload.valid_from = valid_from;
        }
        if (valid_until !== undefined) {
            if (!isValidDate(valid_until)) {
                return new Response(JSON.stringify({ error: 'Invalid date format for valid_until. Use YYYY-MM-DD.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
                })
            }
            updatePayload.valid_until = valid_until;
        }
        if (updatePayload.valid_from && updatePayload.valid_until && new Date(updatePayload.valid_from) > new Date(updatePayload.valid_until)) {
             return new Response(JSON.stringify({ error: 'valid_from date cannot be after valid_until date.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
            })
        }
        // If only one date is provided, ensure it's consistent with existing stored date
        // This logic might be complex and better handled by fetching existing record first if needed.
        // For simplicity, we'll assume the frontend sends both if one changes to maintain consistency, or backend handles it.

        if (days_of_week !== undefined) {
            if (!isValidDaysOfWeek(days_of_week)) {
                return new Response(JSON.stringify({ error: 'days_of_week must be an array of numbers (1-7).' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
                })
            }
            updatePayload.days_of_week = days_of_week;
        }
        
        if (Object.keys(updatePayload).length === 0) {
             return new Response(JSON.stringify({ error: 'No valid fields to update provided' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
            })
        }


        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .update(updatePayload)
          .eq('id', tariffId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') { 
                return new Response(JSON.stringify({ error: 'Tariff not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (!data) {
             return new Response(JSON.stringify({ error: 'Tariff not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'DELETE': { // Delete Tariff
        if (!tariffId) {
          return new Response(JSON.stringify({ error: 'Tariff ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }

        const { data: existing, error: fetchError } = await supabaseAdmin.from(TABLE_NAME).select('id').eq('id', tariffId).single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        if (!existing) {
             return new Response(JSON.stringify({ error: 'Tariff not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from(TABLE_NAME)
          .delete()
          .eq('id', tariffId)

        if (error) throw error // ON DELETE CASCADE handles promotion_applicable_tariffs
        return new Response(null, {
          headers: { ...corsHeaders }, status: 204, // No Content
        })
      }

      default:
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
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
