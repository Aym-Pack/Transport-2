import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const TABLE_NAME = 'loyalty_programs'

// Helper for validation
interface LoyaltyProgramValidationErrors {
  field?: string;
  message: string;
}
function validateLoyaltyProgramData(body: any, isUpdate = false): LoyaltyProgramValidationErrors[] {
  const errors: LoyaltyProgramValidationErrors[] = [];

  if (!isUpdate) { // Fields required for creation
    if (!body.name) errors.push({ field: 'name', message: 'Field "name" is required.' });
    if (body.points_per_currency_unit_spent === undefined) errors.push({ field: 'points_per_currency_unit_spent', message: 'Field "points_per_currency_unit_spent" is required.' });
    if (!body.base_currency_code_for_points) errors.push({ field: 'base_currency_code_for_points', message: 'Field "base_currency_code_for_points" is required.' });
  }

  if (body.name && (typeof body.name !== 'string' || !body.name.trim())) {
    errors.push({ field: 'name', message: 'Name must be a non-empty string.' });
  }
  if (body.points_per_currency_unit_spent !== undefined) {
    if (typeof body.points_per_currency_unit_spent !== 'number' || body.points_per_currency_unit_spent <= 0) {
      errors.push({ field: 'points_per_currency_unit_spent', message: 'Points per currency unit spent must be a positive number.' });
    }
  }
  if (body.base_currency_code_for_points && typeof body.base_currency_code_for_points !== 'string') {
    errors.push({ field: 'base_currency_code_for_points', message: 'Base currency code must be a string.' });
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.push({ field: 'is_active', message: 'Is Active must be a boolean.' });
  }

  return errors;
}

// Helper to deactivate other active programs
async function deactivateOtherPrograms(currentProgramId?: string | bigint) {
  let query = supabaseAdmin.from(TABLE_NAME).update({ is_active: false }).eq('is_active', true);
  if (currentProgramId) {
    query = query.neq('id', currentProgramId);
  }
  const { error: deactivateError } = await query;
  if (deactivateError) {
    console.error("Error deactivating other programs:", deactivateError);
    throw new Error(`Failed to deactivate other programs: ${deactivateError.message}`);
  }
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const programId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null;

    switch (req.method) {
      case 'POST': { // Create Loyalty Program
        const body = await req.json()
        const validationErrors = validateLoyaltyProgramData(body);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422, // Unprocessable Entity
          })
        }

        if (body.is_active === true) {
          await deactivateOtherPrograms();
        }

        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .insert([body])
          .select('*, base_currency_code_for_points:currencies(code, name, symbol)')
          .single()

        if (error) {
            if (error.code === '23505' && error.message.includes('loyalty_programs_name_key')) {
                 return new Response(JSON.stringify({ errors: [{ field: 'name', message: 'A loyalty program with this name already exists.' }] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409, // Conflict
                });
            }
            throw error;
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      case 'GET': { // Read Loyalty Program(s)
        let query = supabaseAdmin
          .from(TABLE_NAME)
          .select(`
            *,
            base_currency_code_for_points:currencies(code, name, symbol)
          `)

        if (programId) { // Get by ID
          query = query.eq('id', programId).single()
        } else { // List all
          query = query.order('is_active', { ascending: false }).order('name')
        }

        const { data, error } = await query

        if (error) {
            if (error.code === 'PGRST116' && programId) {
                return new Response(JSON.stringify({ error: 'Loyalty Program not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (programId && !data) {
            return new Response(JSON.stringify({ error: 'Loyalty Program not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'PUT': { // Update Loyalty Program
        if (!programId) {
          return new Response(JSON.stringify({ error: 'Loyalty Program ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        const body = await req.json()
        const validationErrors = validateLoyaltyProgramData(body, true); // isUpdate = true
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }

        if (body.is_active === true) {
          await deactivateOtherPrograms(programId);
        }
        // If setting to false, we are not enforcing at least one active program here, as per current instruction.

        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .update(body)
          .eq('id', programId)
          .select('*, base_currency_code_for_points:currencies(code, name, symbol)')
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Loyalty Program not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            if (error.code === '23505' && error.message.includes('loyalty_programs_name_key')) {
                 return new Response(JSON.stringify({ errors: [{ field: 'name', message: 'A loyalty program with this name already exists.' }] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409,
                });
            }
            throw error;
        }
        if (!data) {
             return new Response(JSON.stringify({ error: 'Loyalty Program not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'DELETE': { // Delete Loyalty Program
        if (!programId) {
          return new Response(JSON.stringify({ error: 'Loyalty Program ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }

        const { data: existing, error: fetchError } = await supabaseAdmin.from(TABLE_NAME).select('id').eq('id', programId).single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        if (!existing) {
             return new Response(JSON.stringify({ error: 'Loyalty Program not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from(TABLE_NAME)
          .delete()
          .eq('id', programId)

        if (error) throw error // ON DELETE CASCADE handles related tiers/rewards
        return new Response(JSON.stringify({message: "Loyalty Program deleted successfully"}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      default:
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
        })
    }
  } catch (error) {
    console.error('Error processing loyalty program request:', error);
    let errorMessage = 'An unexpected error occurred.';
    let errorStatus = 500;

    if (error.message.includes('not found')) {
        errorMessage = error.message;
        errorStatus = 404;
    } else if (error.message.startsWith('Failed to deactivate other programs:')) {
        // This is a specific internal error, might want to mask it for client
        errorMessage = 'An error occurred while updating program activation states.';
        // errorStatus might remain 500 or be a specific business logic error code
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errorStatus,
    });
  }
})
