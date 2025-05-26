import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const PROMOTIONS_TABLE = 'promotions'
const APPLICABLE_TARIFFS_TABLE = 'promotion_applicable_tariffs'

// Helper to validate date strings (YYYY-MM-DDTHH:mm:ssZ or YYYY-MM-DD)
function isValidDateTime(dateTimeString: string | null | undefined): boolean {
  if (!dateTimeString) return false; // Required for valid_from, valid_until
  return !isNaN(new Date(dateTimeString).getTime());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const promotionId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null;

    switch (req.method) {
      case 'POST': { // Create Promotion
        const body = await req.json()
        const {
          name, discount_type, discount_value, valid_from, valid_until, // Required
          description, promo_code, applicable_to_all_tariffs = false,
          applicable_routes, applicable_vehicle_types, max_uses, is_active,
          passenger_tariff_ids // Array of BIGINTs
        } = body

        if (!name || !discount_type || discount_value === undefined || !valid_from || !valid_until) {
          return new Response(JSON.stringify({ error: 'Missing required fields: name, discount_type, discount_value, valid_from, valid_until' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        if (typeof discount_value !== 'number' || discount_value <= 0) {
          return new Response(JSON.stringify({ error: 'Discount value must be a positive number.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        if (!isValidDateTime(valid_from) || !isValidDateTime(valid_until)) {
            return new Response(JSON.stringify({ error: 'Invalid date format for valid_from or valid_until.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        if (new Date(valid_from) >= new Date(valid_until)) {
            return new Response(JSON.stringify({ error: 'valid_from date must be before valid_until date.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        if (promo_code && typeof promo_code !== 'string') {
             return new Response(JSON.stringify({ error: 'Promo code must be a string.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }


        // Insert into promotions table
        const { data: promotionData, error: promotionError } = await supabaseAdmin
          .from(PROMOTIONS_TABLE)
          .insert([{
            name, discount_type, discount_value, valid_from, valid_until, description,
            promo_code, applicable_to_all_tariffs, applicable_routes,
            applicable_vehicle_types, max_uses, is_active
          }])
          .select()
          .single()

        if (promotionError) {
            if (promotionError.code === '23505' && promotionError.constraint === 'promotions_promo_code_key') { // unique_violation for promo_code
                return new Response(JSON.stringify({ error: 'Promo code must be unique.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409, // Conflict
                });
            }
            throw promotionError;
        }
        if (!promotionData) throw new Error("Failed to create promotion, no data returned.");


        // If applicable_to_all_tariffs is false and passenger_tariff_ids are provided, insert them
        let insertedTariffIds: string[] = [];
        if (!applicable_to_all_tariffs && Array.isArray(passenger_tariff_ids) && passenger_tariff_ids.length > 0) {
          const tariffsToInsert = passenger_tariff_ids.map(tariffId => ({
            promotion_id: promotionData.id,
            passenger_tariff_id: BigInt(tariffId) // Ensure BigInt for DB
          }));
          const { data: insertedTariffs, error: tariffsError } = await supabaseAdmin
            .from(APPLICABLE_TARIFFS_TABLE)
            .insert(tariffsToInsert)
            .select('passenger_tariff_id');
          
          if (tariffsError) {
            // Attempt to delete the already created promotion if linking tariffs fails
            await supabaseAdmin.from(PROMOTIONS_TABLE).delete().eq('id', promotionData.id);
            throw new Error(`Failed to link tariffs: ${tariffsError.message}`);
          }
          insertedTariffIds = insertedTariffs ? insertedTariffs.map(t => t.passenger_tariff_id.toString()) : [];
        }

        return new Response(JSON.stringify({ ...promotionData, passenger_tariff_ids: insertedTariffIds }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      case 'GET': { // Read Promotion(s)
        let query = supabaseAdmin.from(PROMOTIONS_TABLE).select('*')

        if (promotionId) { // Get by ID
          query = query.eq('id', promotionId).single()
          const { data: promotionData, error: promotionError } = await query;

          if (promotionError) {
            if (promotionError.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Promotion not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw promotionError;
          }
          if (!promotionData) {
             return new Response(JSON.stringify({ error: 'Promotion not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
          }

          let tariffIds: string[] = [];
          if (!promotionData.applicable_to_all_tariffs) {
            const { data: applicableTariffs, error: tariffsError } = await supabaseAdmin
              .from(APPLICABLE_TARIFFS_TABLE)
              .select('passenger_tariff_id')
              .eq('promotion_id', promotionData.id);
            if (tariffsError) throw tariffsError;
            tariffIds = applicableTariffs ? applicableTariffs.map(t => t.passenger_tariff_id.toString()) : [];
          }
          
          return new Response(JSON.stringify({ ...promotionData, passenger_tariff_ids: tariffIds }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
          })

        } else { // List all
          if (url.searchParams.has('is_active')) query = query.eq('is_active', url.searchParams.get('is_active') === 'true')
          if (url.searchParams.has('promo_code')) query = query.ilike('promo_code', `%${url.searchParams.get('promo_code')}%`)
          
          query = query.order('name');
          const { data, error } = await query;
          if (error) throw error;

          // For list view, fetching all tariff IDs for each promotion might be too heavy.
          // Consider if this is truly needed or if a separate endpoint/flag should control this.
          // For now, omitting detailed tariff lists in the general list view for performance.
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
          })
        }
      }

      case 'PUT': { // Update Promotion
        if (!promotionId) {
          return new Response(JSON.stringify({ error: 'Promotion ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        const body = await req.json()
        const { passenger_tariff_ids, ...promotionUpdates } = body;
        
        // Validate promotion fields before update
        if (promotionUpdates.discount_value !== undefined && (typeof promotionUpdates.discount_value !== 'number' || promotionUpdates.discount_value <= 0)) {
             return new Response(JSON.stringify({ error: 'Discount value must be a positive number.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
            })
        }
        if (promotionUpdates.valid_from && !isValidDateTime(promotionUpdates.valid_from)) {
             return new Response(JSON.stringify({ error: 'Invalid date format for valid_from.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
            })
        }
        if (promotionUpdates.valid_until && !isValidDateTime(promotionUpdates.valid_until)) {
             return new Response(JSON.stringify({ error: 'Invalid date format for valid_until.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
            })
        }
        if (promotionUpdates.valid_from && promotionUpdates.valid_until && new Date(promotionUpdates.valid_from) >= new Date(promotionUpdates.valid_until)) {
            return new Response(JSON.stringify({ error: 'valid_from date must be before valid_until date.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
            })
        }


        // Update promotion details
        const { data: updatedPromotionData, error: updateError } = await supabaseAdmin
          .from(PROMOTIONS_TABLE)
          .update(promotionUpdates)
          .eq('id', promotionId)
          .select()
          .single()

        if (updateError) {
            if (updateError.code === 'PGRST116') { 
                return new Response(JSON.stringify({ error: 'Promotion not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
             if (updateError.code === '23505' && updateError.constraint === 'promotions_promo_code_key') {
                return new Response(JSON.stringify({ error: 'Promo code must be unique.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409,
                });
            }
            throw updateError;
        }
        if (!updatedPromotionData) {
             return new Response(JSON.stringify({ error: 'Promotion not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }

        // Update applicable tariffs if passenger_tariff_ids is provided
        let updatedTariffIds: string[] = [];
        if (Array.isArray(passenger_tariff_ids)) {
          // Delete existing
          const { error: deleteError } = await supabaseAdmin
            .from(APPLICABLE_TARIFFS_TABLE)
            .delete()
            .eq('promotion_id', promotionId);
          if (deleteError) throw new Error(`Failed to update linked tariffs (delete step): ${deleteError.message}`);

          // Insert new if not applicable_to_all_tariffs
          if (!updatedPromotionData.applicable_to_all_tariffs && passenger_tariff_ids.length > 0) {
            const tariffsToInsert = passenger_tariff_ids.map(tariffId => ({
              promotion_id: promotionId,
              passenger_tariff_id: BigInt(tariffId)
            }));
            const { data: insertedTariffs, error: insertError } = await supabaseAdmin
              .from(APPLICABLE_TARIFFS_TABLE)
              .insert(tariffsToInsert)
              .select('passenger_tariff_id');
            if (insertError) throw new Error(`Failed to update linked tariffs (insert step): ${insertError.message}`);
            updatedTariffIds = insertedTariffs ? insertedTariffs.map(t => t.passenger_tariff_id.toString()) : [];
          }
        } else {
            // If passenger_tariff_ids was not provided in PUT, fetch current ones to return
            if (!updatedPromotionData.applicable_to_all_tariffs) {
                const { data: currentTariffs, error: currentTariffsError } = await supabaseAdmin
                    .from(APPLICABLE_TARIFFS_TABLE)
                    .select('passenger_tariff_id')
                    .eq('promotion_id', promotionId);
                if (currentTariffsError) throw currentTariffsError;
                updatedTariffIds = currentTariffs ? currentTariffs.map(t => t.passenger_tariff_id.toString()) : [];
            }
        }
        
        return new Response(JSON.stringify({ ...updatedPromotionData, passenger_tariff_ids: updatedTariffIds }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'DELETE': { // Delete Promotion
        if (!promotionId) {
          return new Response(JSON.stringify({ error: 'Promotion ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        const { data: existing, error: fetchError } = await supabaseAdmin.from(PROMOTIONS_TABLE).select('id').eq('id', promotionId).single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        if (!existing) {
             return new Response(JSON.stringify({ error: 'Promotion not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from(PROMOTIONS_TABLE)
          .delete()
          .eq('id', promotionId)

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
