import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const TABLE_NAME = 'policy_rules'
const POLICY_TYPES = ['CANCELLATION', 'MODIFICATION', 'REFUND'];
const FEE_TYPES = ['PERCENTAGE_OF_PRICE', 'FIXED_AMOUNT', 'NO_FEE'];

// Helper for validation
interface ValidationError {
  field: string;
  message: string;
}

function validatePolicyRuleData(body: any, isUpdate = false): ValidationError[] {
  const errors: ValidationError[] = [];

  // Field-specific validations
  if (!isUpdate || body.name !== undefined) {
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      errors.push({ field: 'name', message: 'Name is required and must be a non-empty string.' });
    }
  }

  if (!isUpdate || body.policy_type !== undefined) {
    if (!body.policy_type) {
      errors.push({ field: 'policy_type', message: 'Policy type is required.' });
    } else if (!POLICY_TYPES.includes(body.policy_type)) {
      errors.push({ field: 'policy_type', message: `Invalid policy type. Must be one of: ${POLICY_TYPES.join(', ')}.` });
    }
  }

  if (!isUpdate || body.fee_type !== undefined) {
      if (!body.fee_type) {
        errors.push({ field: 'fee_type', message: 'Fee type is required.' });
      } else if (!FEE_TYPES.includes(body.fee_type)) {
        errors.push({ field: 'fee_type', message: `Invalid fee type. Must be one of: ${FEE_TYPES.join(', ')}.` });
      }
  }


  if (body.fee_type === 'NO_FEE') {
    // For NO_FEE, fee_value must be null or undefined. If it's explicitly provided and not null, it's an error.
    if (body.fee_value !== undefined && body.fee_value !== null) {
      errors.push({ field: 'fee_value', message: 'Fee value must be null or not provided if fee type is "NO_FEE".' });
    }
  } else if (body.fee_type && (body.fee_value === undefined || body.fee_value === null)) {
    // For other fee types, fee_value is required.
    errors.push({ field: 'fee_value', message: 'Fee value is required if fee type is not "NO_FEE".' });
  } else if (body.fee_value !== undefined && body.fee_value !== null) {
    // If fee_value is provided (and required), it must be a non-negative number.
    if (typeof body.fee_value !== 'number' || body.fee_value < 0) {
      errors.push({ field: 'fee_value', message: 'Fee value must be a non-negative number.' });
    }
  }


  if (body.min_hours_before_departure !== undefined && body.min_hours_before_departure !== null) {
    if (typeof body.min_hours_before_departure !== 'number' || body.min_hours_before_departure < 0) {
      errors.push({ field: 'min_hours_before_departure', message: 'Min hours before departure must be a non-negative integer.' });
    }
  }
  if (body.max_hours_before_departure !== undefined && body.max_hours_before_departure !== null) {
    if (typeof body.max_hours_before_departure !== 'number' || body.max_hours_before_departure < 0) {
      errors.push({ field: 'max_hours_before_departure', message: 'Max hours before departure must be a non-negative integer.' });
    }
  }

  // Cross-field validation for min/max hours
  const minHours = typeof body.min_hours_before_departure === 'number' ? body.min_hours_before_departure : null;
  const maxHours = typeof body.max_hours_before_departure === 'number' ? body.max_hours_before_departure : null;
  if (minHours !== null && maxHours !== null && maxHours <= minHours) {
    errors.push({ field: 'max_hours_before_departure', message: 'Max hours before departure must be greater than Min hours before departure.' });
  }

  if (!isUpdate || body.priority !== undefined) {
    if (body.priority === undefined || body.priority === null || typeof body.priority !== 'number') { // Ensure it's a number
      errors.push({ field: 'priority', message: 'Priority is required and must be a number.' });
    }
  }

  if (!isUpdate || body.is_allowed !== undefined) {
    if (typeof body.is_allowed !== 'boolean') {
      errors.push({ field: 'is_allowed', message: 'Is Allowed field is required and must be true or false.' });
    }
  }

  return errors;
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const ruleId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null;

    switch (req.method) {
      case 'POST': { // Create Policy Rule
        const body = await req.json()
        const validationErrors = validatePolicyRuleData(body, false); // isUpdate = false
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422, // Unprocessable Entity
          })
        }

        const payloadToInsert = { ...body };
        if (payloadToInsert.fee_type === 'NO_FEE') {
            payloadToInsert.fee_value = null;
        }

        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .insert([payloadToInsert]) // Deno/Supabase client handles undefined fields correctly
          .select()
          .single()

        if (error) {
            // Example: Unique constraint on 'name' (if it were added to DB)
            // This part is speculative as 'name' is not unique in the current schema.
            // If 'name' were unique: if (error.code === '23505' && error.message.includes('policy_rules_name_key'))
            if (error.code === '23505') { // Generic unique violation
                 return new Response(JSON.stringify({ errors: [{ field: 'form', message: 'A policy rule with similar unique properties already exists.' }] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409, // Conflict
                });
            }
            throw error;
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      case 'GET': { // Read Policy Rule(s)
        let query = supabaseAdmin
          .from(TABLE_NAME)
          .select(`
            *,
            routes (name),
            vehicle_types (name)
          `)

        if (ruleId) { // Get by ID
          query = query.eq('id', ruleId).single()
        } else { // List all, potentially filtered
          if (url.searchParams.has('policy_type')) query = query.eq('policy_type', url.searchParams.get('policy_type'))
          if (url.searchParams.has('is_active')) query = query.eq('is_active', url.searchParams.get('is_active') === 'true')
          if (url.searchParams.has('applicable_route_id')) query = query.eq('applicable_route_id', url.searchParams.get('applicable_route_id'))
          if (url.searchParams.has('applicable_vehicle_type_id')) query = query.eq('applicable_vehicle_type_id', url.searchParams.get('applicable_vehicle_type_id'))

          query = query.order('priority', { ascending: false }).order('name')
        }

        const { data, error } = await query

        if (error) {
            if (error.code === 'PGRST116' && ruleId) { // Not found for single GET
                return new Response(JSON.stringify({ error: 'Policy Rule not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (ruleId && !data) { // Safeguard for single GET
            return new Response(JSON.stringify({ error: 'Policy Rule not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'PUT': { // Update Policy Rule
        if (!ruleId) {
          return new Response(JSON.stringify({ error: 'Policy Rule ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        const body = await req.json()
        const validationErrors = validatePolicyRuleData(body, true); // isUpdate = true
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422, // Unprocessable Entity
          })
        }

        const payloadToUpdate = { ...body };
        if (payloadToUpdate.fee_type === 'NO_FEE') {
            payloadToUpdate.fee_value = null;
        } else if (payloadToUpdate.fee_type && payloadToUpdate.fee_value === undefined) {
             // If fee_type is changed to something other than NO_FEE, but fee_value is not provided,
             // the validator should have caught this if fee_value became required.
        }


        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .update(payloadToUpdate)
          .eq('id', ruleId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Policy Rule not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
             // Example: Unique constraint on 'name'
            if (error.code === '23505') { // Generic unique violation
                 return new Response(JSON.stringify({ errors: [{ field: 'form', message: 'A policy rule with similar unique properties already exists.' }] }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409, // Conflict
                });
            }
            throw error;
        }
        if (!data) {
             return new Response(JSON.stringify({ error: 'Policy Rule not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'DELETE': { // Delete Policy Rule
        if (!ruleId) {
          return new Response(JSON.stringify({ error: 'Policy Rule ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }

        const { data: existing, error: fetchError } = await supabaseAdmin.from(TABLE_NAME).select('id').eq('id', ruleId).single();
        if (fetchError && fetchError.code !== 'PGRST116') {
             // If error is not "not found", rethrow
            if (fetchError.code !== 'PGRST116') throw fetchError;
        }
        if (!existing && (!fetchError || fetchError.code === 'PGRST116')) { // Not found or "not found" error
             return new Response(JSON.stringify({ error: 'Policy Rule not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from(TABLE_NAME)
          .delete()
          .eq('id', ruleId)

        if (error) throw error
        return new Response(JSON.stringify({message: "Policy Rule deleted successfully"}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200, // Or 204 No Content
        })
      }

      default:
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
        })
    }
  } catch (error) {
    console.error('Error processing request:', error);
    let errorMessage = 'An unexpected error occurred.';
    let errorStatus = 500;

    if (error.message.includes('not found')) { // Basic check for "not found" style errors
        errorMessage = error.message;
        errorStatus = 404;
    }
    // Avoid exposing raw DB errors or stack traces in production
    // if (error.code) { /* map known DB errors to user-friendly messages */ }

    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: errorStatus,
    });
  }
})
