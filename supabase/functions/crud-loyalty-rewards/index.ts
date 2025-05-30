import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const TABLE_NAME = 'loyalty_rewards'
const TIERS_TABLE_NAME = 'loyalty_tiers'
const REWARD_TYPES = [
  'PERCENTAGE_DISCOUNT_ON_BOOKING',
  'FIXED_AMOUNT_VOUCHER_ON_BOOKING',
  'FREE_TRIP_VOUCHER',
  'UPGRADE_TO_VEHICLE_TYPE',
  'COMPLIMENTARY_ITEM_OR_SERVICE'
];

// Helper for validation
interface LoyaltyRewardValidationErrors {
  field: string;
  message: string;
}
async function validateLoyaltyRewardData(body: any, isUpdate = false): Promise<LoyaltyRewardValidationErrors[]> {
  const errors: LoyaltyRewardValidationErrors[] = [];
  const rewardType = body.reward_type || (isUpdate ? null : undefined); // Get reward_type for validation logic

  if (!isUpdate) { // Fields required for creation
    if (body.loyalty_tier_id === undefined) errors.push({ field: 'loyalty_tier_id', message: 'Field "loyalty_tier_id" is required.' });
    if (!body.name) errors.push({ field: 'name', message: 'Field "name" is required.' });
    if (!rewardType) errors.push({ field: 'reward_type', message: 'Field "reward_type" is required.' });
  }

  if (body.loyalty_tier_id !== undefined) {
     if (typeof body.loyalty_tier_id !== 'number' && typeof body.loyalty_tier_id !== 'bigint') {
        errors.push({field: 'loyalty_tier_id', message: 'Loyalty Tier ID must be a valid number (BigInt).'});
    } else {
        const { data: tier, error: tierError } = await supabaseAdmin
            .from(TIERS_TABLE_NAME)
            .select('id')
            .eq('id', body.loyalty_tier_id)
            .single();
        if (tierError || !tier) {
            errors.push({ field: 'loyalty_tier_id', message: `Loyalty tier with ID ${body.loyalty_tier_id} not found.` });
        }
    }
  }

  if (body.name && (typeof body.name !== 'string' || !body.name.trim())) {
    errors.push({ field: 'name', message: 'Name must be a non-empty string.' });
  }
  if (rewardType && !REWARD_TYPES.includes(rewardType)) {
    errors.push({ field: 'reward_type', message: `Invalid reward_type. Must be one of: ${REWARD_TYPES.join(', ')}.` });
  }

  // Reward Type specific validations (mirroring DB CHECK constraints)
  if (rewardType === 'PERCENTAGE_DISCOUNT_ON_BOOKING') {
    if (body.reward_value_percentage === undefined || body.reward_value_percentage === null) errors.push({ field: 'reward_value_percentage', message: 'Percentage value is required for this reward type.' });
    else if (typeof body.reward_value_percentage !== 'number' || body.reward_value_percentage <= 0 || body.reward_value_percentage > 100) errors.push({ field: 'reward_value_percentage', message: 'Percentage value must be between 1 and 100.' });
    if (body.reward_value_fixed_amount !== undefined && body.reward_value_fixed_amount !== null) errors.push({ field: 'reward_value_fixed_amount', message: 'Fixed amount should not be set for percentage discount.'});
    // ... and so on for other irrelevant fields
  } else if (rewardType === 'FIXED_AMOUNT_VOUCHER_ON_BOOKING') {
    if (body.reward_value_fixed_amount === undefined || body.reward_value_fixed_amount === null) errors.push({ field: 'reward_value_fixed_amount', message: 'Fixed amount is required.' });
    else if (typeof body.reward_value_fixed_amount !== 'number' || body.reward_value_fixed_amount <= 0) errors.push({ field: 'reward_value_fixed_amount', message: 'Fixed amount must be a positive number.' });
    if (!body.reward_value_currency_code) errors.push({ field: 'reward_value_currency_code', message: 'Currency code is required for fixed amount voucher.' });
    // ... and so on for other irrelevant fields
  } else if (rewardType === 'FREE_TRIP_VOUCHER') {
    if (!body.free_trip_route_id) errors.push({ field: 'free_trip_route_id', message: 'Route ID is required for free trip voucher.' });
    // ...
  } else if (rewardType === 'UPGRADE_TO_VEHICLE_TYPE') {
    if (!body.upgrade_to_vehicle_type_id) errors.push({ field: 'upgrade_to_vehicle_type_id', message: 'Vehicle Type ID for upgrade is required.' });
    // ...
  } else if (rewardType === 'COMPLIMENTARY_ITEM_OR_SERVICE') {
    if (!body.complimentary_item_description || !body.complimentary_item_description.trim()) errors.push({ field: 'complimentary_item_description', message: 'Item/Service description is required.' });
    // ...
  }

  if (body.points_to_redeem !== undefined && body.points_to_redeem !== null) {
    if (typeof body.points_to_redeem !== 'number' || body.points_to_redeem <= 0) {
      errors.push({ field: 'points_to_redeem', message: 'Points to redeem must be a positive integer.' });
    }
  }
  if (body.is_auto_applied_on_tier_achieve !== undefined && typeof body.is_auto_applied_on_tier_achieve !== 'boolean') {
    errors.push({ field: 'is_auto_applied_on_tier_achieve', message: 'Is Auto Applied must be a boolean.' });
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.push({ field: 'is_active', message: 'Is Active must be a boolean.' });
  }

  return errors;
}

// Helper to nullify irrelevant fields based on reward_type
function cleanRewardData(body: any): any {
    const cleaned = { ...body };
    const type = cleaned.reward_type;

    if (type !== 'PERCENTAGE_DISCOUNT_ON_BOOKING') {
        cleaned.reward_value_percentage = null;
    }
    if (type !== 'FIXED_AMOUNT_VOUCHER_ON_BOOKING') {
        cleaned.reward_value_fixed_amount = null;
        cleaned.reward_value_currency_code = null; // Also clear if not fixed amount
    }
    if (type === 'FIXED_AMOUNT_VOUCHER_ON_BOOKING' && !cleaned.reward_value_currency_code) {
        // This case should be caught by validation, but as a safeguard or if partial update
    }
    if (type !== 'FREE_TRIP_VOUCHER') {
        cleaned.free_trip_route_id = null;
    }
    if (type !== 'UPGRADE_TO_VEHICLE_TYPE') {
        cleaned.upgrade_to_vehicle_type_id = null;
    }
    if (type !== 'COMPLIMENTARY_ITEM_OR_SERVICE') {
        cleaned.complimentary_item_description = null;
    }
    return cleaned;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const rewardId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null;
    const tierIdParam = url.searchParams.get('tier_id') ? BigInt(url.searchParams.get('tier_id')!) : null;

    switch (req.method) {
      case 'POST': { // Create Loyalty Reward
        let body = await req.json()
        const validationErrors = await validateLoyaltyRewardData(body);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }
        body = cleanRewardData(body);

        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .insert([body])
          .select()
          .single()

        if (error) throw error // DB check constraints should handle most data consistency issues if not caught by validator
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      case 'GET': { // Read Loyalty Reward(s)
        let query = supabaseAdmin.from(TABLE_NAME).select('*, loyalty_tier_id!inner(loyalty_program_id!inner(name))') // Example join

        if (rewardId) { // Get by specific reward ID
          query = query.eq('id', rewardId).single()
        } else if (tierIdParam) { // List rewards for a tier
          query = query.eq('loyalty_tier_id', tierIdParam).order('name')
        } else {
           return new Response(JSON.stringify({ error: 'tier_id query parameter is required to list rewards.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }

        const { data, error } = await query

        if (error) {
            if (error.code === 'PGRST116' && rewardId) {
                return new Response(JSON.stringify({ error: 'Loyalty Reward not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (rewardId && !data) {
            return new Response(JSON.stringify({ error: 'Loyalty Reward not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'PUT': { // Update Loyalty Reward
        if (!rewardId) {
          return new Response(JSON.stringify({ error: 'Loyalty Reward ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        let body = await req.json()
        // loyalty_tier_id should not be updatable
        if (body.loyalty_tier_id !== undefined) {
            delete body.loyalty_tier_id;
        }
        // If reward_type is updated, existing specific value fields might become invalid.
        // Fetch existing record to determine original reward_type if necessary for complex validation logic,
        // or rely on cleanRewardData to nullify fields based on the *new* reward_type.
        const validationErrors = await validateLoyaltyRewardData(body, true);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }
        body = cleanRewardData(body);


        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .update(body)
          .eq('id', rewardId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Loyalty Reward not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error; // DB check constraints handle data consistency
        }
        if (!data) {
             return new Response(JSON.stringify({ error: 'Loyalty Reward not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'DELETE': { // Delete Loyalty Reward
        if (!rewardId) {
          return new Response(JSON.stringify({ error: 'Loyalty Reward ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }

        const { data: existing, error: fetchError } = await supabaseAdmin.from(TABLE_NAME).select('id').eq('id', rewardId).single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        if (!existing) {
             return new Response(JSON.stringify({ error: 'Loyalty Reward not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from(TABLE_NAME)
          .delete()
          .eq('id', rewardId)

        if (error) throw error
        return new Response(JSON.stringify({message: "Loyalty Reward deleted successfully"}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      default:
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
        })
    }
  } catch (error) {
    console.error('Error processing loyalty reward request:', error);
    // Basic error handling, can be expanded
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || (error.message?.includes('not found') ? 404 : 500),
    });
  }
})
