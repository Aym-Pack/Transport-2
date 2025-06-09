import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const TABLE_NAME = 'loyalty_tiers'
const PROGRAMS_TABLE_NAME = 'loyalty_programs'

// Helper for validation
interface LoyaltyTierValidationErrors {
  field: string;
  message: string;
}
async function validateLoyaltyTierData(body: any, isUpdate = false, tierIdToExclude?: string | bigint): Promise<LoyaltyTierValidationErrors[]> {
  const errors: LoyaltyTierValidationErrors[] = [];

  if (!isUpdate) { // Fields required for creation
    if (body.loyalty_program_id === undefined) errors.push({ field: 'loyalty_program_id', message: 'Field "loyalty_program_id" is required.' });
    if (!body.name) errors.push({ field: 'name', message: 'Field "name" is required.' });
    if (body.points_threshold === undefined) errors.push({ field: 'points_threshold', message: 'Field "points_threshold" is required.' });
  }

  if (body.loyalty_program_id !== undefined) {
    if (typeof body.loyalty_program_id !== 'number' && typeof body.loyalty_program_id !== 'bigint') { // Allow number from JS for BigInt conversion
        errors.push({field: 'loyalty_program_id', message: 'Loyalty Program ID must be a valid number (BigInt).'});
    } else {
        const { data: program, error: programError } = await supabaseAdmin
            .from(PROGRAMS_TABLE_NAME)
            .select('id')
            .eq('id', body.loyalty_program_id)
            .single();
        if (programError || !program) {
            errors.push({ field: 'loyalty_program_id', message: `Loyalty program with ID ${body.loyalty_program_id} not found.` });
        }
    }
  }

  if (body.name && (typeof body.name !== 'string' || !body.name.trim())) {
    errors.push({ field: 'name', message: 'Name must be a non-empty string.' });
  }
  if (body.points_threshold !== undefined) {
    if (typeof body.points_threshold !== 'number' || body.points_threshold < 0) {
      errors.push({ field: 'points_threshold', message: 'Points threshold must be a non-negative integer.' });
    }
  }
  if (body.tier_order !== undefined && body.tier_order !== null) { // tier_order has default 0
    if (typeof body.tier_order !== 'number' || body.tier_order < 0) {
      errors.push({ field: 'tier_order', message: 'Tier order must be a non-negative integer.' });
    }
  }
  // Note: Unique constraint checks for (loyalty_program_id, name/points_threshold/tier_order) are best handled by DB + error parsing.

  return errors;
}

function parseDbErrorMessage(dbError: any): LoyaltyTierValidationErrors[] {
    if (dbError.code === '23505') { // unique_violation
        if (dbError.constraint === 'loyalty_tiers_loyalty_program_id_name_key') {
            return [{ field: 'name', message: 'This name is already used for a tier in this loyalty program.' }];
        }
        if (dbError.constraint === 'loyalty_tiers_loyalty_program_id_points_threshold_key') {
            return [{ field: 'points_threshold', message: 'This points threshold is already used for a tier in this loyalty program.' }];
        }
        if (dbError.constraint === 'loyalty_tiers_loyalty_program_id_tier_order_key') {
            return [{ field: 'tier_order', message: 'This tier order is already used for a tier in this loyalty program.' }];
        }
        return [{ field: 'form', message: 'A tier with similar unique properties already exists in this program.' }];
    }
    return [{ field: 'database', message: dbError.message || 'A database error occurred.' }];
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const tierId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null;
    const programIdParam = url.searchParams.get('program_id') ? BigInt(url.searchParams.get('program_id')!) : null;


    switch (req.method) {
      case 'POST': { // Create Loyalty Tier
        const body = await req.json()
        const validationErrors = await validateLoyaltyTierData(body);
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

        if (error) {
            const parsedErrors = parseDbErrorMessage(error);
            return new Response(JSON.stringify({ errors: parsedErrors }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.code === '23505' ? 409 : 500,
            });
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      case 'GET': { // Read Loyalty Tier(s)
        let query = supabaseAdmin.from(TABLE_NAME).select('*')

        if (tierId) { // Get by specific tier ID
          query = query.eq('id', tierId).single()
        } else if (programIdParam) { // List tiers for a program
          query = query.eq('loyalty_program_id', programIdParam).order('tier_order').order('points_threshold')
        } else {
          // No specific ID or program_id, could list all tiers across all programs, or return error.
          // For now, let's assume if no program_id is given for listing, it's a general list (might need pagination).
          // However, the spec implies listing is primarily by program_id.
          // Returning all tiers if no program_id is specified for listing:
           query = query.order('loyalty_program_id').order('tier_order').order('points_threshold')
        }

        const { data, error } = await query

        if (error) {
            if (error.code === 'PGRST116' && tierId) {
                return new Response(JSON.stringify({ error: 'Loyalty Tier not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (tierId && !data) {
            return new Response(JSON.stringify({ error: 'Loyalty Tier not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'PUT': { // Update Loyalty Tier
        if (!tierId) {
          return new Response(JSON.stringify({ error: 'Loyalty Tier ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        const body = await req.json()
        // loyalty_program_id should not be updatable
        if (body.loyalty_program_id !== undefined) {
            delete body.loyalty_program_id;
        }
        const validationErrors = await validateLoyaltyTierData(body, true, tierId);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }

        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .update(body)
          .eq('id', tierId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Loyalty Tier not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            const parsedErrors = parseDbErrorMessage(error);
            return new Response(JSON.stringify({ errors: parsedErrors }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.code === '23505' ? 409 : 500,
            });
        }
        if (!data) {
             return new Response(JSON.stringify({ error: 'Loyalty Tier not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'DELETE': { // Delete Loyalty Tier
        if (!tierId) {
          return new Response(JSON.stringify({ error: 'Loyalty Tier ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }

        const { data: existing, error: fetchError } = await supabaseAdmin.from(TABLE_NAME).select('id').eq('id', tierId).single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        if (!existing) {
             return new Response(JSON.stringify({ error: 'Loyalty Tier not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from(TABLE_NAME)
          .delete()
          .eq('id', tierId)

        if (error) throw error // ON DELETE CASCADE handles related rewards
        return new Response(JSON.stringify({message: "Loyalty Tier deleted successfully"}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      default:
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
        })
    }
  } catch (error) {
    console.error('Error processing loyalty tier request:', error);
    let errorMessage = 'An unexpected error occurred.';
    let errorStatus = 500;

    if (error.message.includes('not found')) { // Generic not found
        errorMessage = error.message;
        errorStatus = 404;
    } else if (error.code) { // Potential DB error code
        // Already handled by parseDbErrorMessage for specific cases like 23505
        // but this could be a fallback if not caught earlier.
        errorMessage = `Database error: ${error.message}`;
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errorStatus,
    });
  }
})
