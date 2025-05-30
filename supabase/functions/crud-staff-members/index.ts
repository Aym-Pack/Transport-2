import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

const TABLE_NAME = 'staff_members'
const USER_PROFILES_TABLE = 'user_profiles'
const STAFF_ROLE_TYPES = ['DRIVER', 'HOSTESS', 'MECHANIC', 'OTHER_CREW'];

interface StaffMemberValidationError {
  field: string;
  message: string;
}

async function validateStaffMemberData(body: any, isUpdate = false, staffIdToExclude?: string): Promise<StaffMemberValidationError[]> {
  const errors: StaffMemberValidationError[] = [];

  if (!isUpdate) { // Fields required for creation
    if (!body.first_name) errors.push({ field: 'first_name', message: 'First name is required.' });
    if (!body.last_name) errors.push({ field: 'last_name', message: 'Last name is required.' });
    if (!body.staff_type) errors.push({ field: 'staff_type', message: 'Staff type is required.' });
  }

  if (body.first_name && (typeof body.first_name !== 'string' || !body.first_name.trim())) {
    errors.push({ field: 'first_name', message: 'First name must be a non-empty string.' });
  }
  if (body.last_name && (typeof body.last_name !== 'string' || !body.last_name.trim())) {
    errors.push({ field: 'last_name', message: 'Last name must be a non-empty string.' });
  }
  if (body.staff_type && !STAFF_ROLE_TYPES.includes(body.staff_type)) {
    errors.push({ field: 'staff_type', message: `Invalid staff type. Must be one of: ${STAFF_ROLE_TYPES.join(', ')}.` });
  }

  if (body.user_profile_id) {
    if (typeof body.user_profile_id !== 'string') { // Assuming UUID is string
        errors.push({ field: 'user_profile_id', message: 'User Profile ID must be a valid UUID string.' });
    } else {
        const { data: profile, error: profileErr } = await supabaseAdmin
            .from(USER_PROFILES_TABLE).select('user_id').eq('user_id', body.user_profile_id).maybeSingle();
        if (profileErr || !profile) {
            errors.push({ field: 'user_profile_id', message: `User profile with ID ${body.user_profile_id} not found.` });
        }
    }
  }

  if (body.license_expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(body.license_expiry_date)) {
    errors.push({ field: 'license_expiry_date', message: 'Invalid license expiry date format. Use YYYY-MM-DD.' });
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    errors.push({ field: 'is_active', message: 'Is Active must be a boolean.' });
  }

  // Unique constraint checks for user_profile_id and employee_id_number are handled by DB + error parsing
  return errors;
}

function parseDbStaffErrorMessage(dbError: any): StaffMemberValidationError[] {
    if (dbError.code === '23505') { // unique_violation
        if (dbError.constraint === 'staff_members_user_profile_id_key') {
            return [{ field: 'user_profile_id', message: 'This user profile is already linked to another staff member.' }];
        }
        if (dbError.constraint === 'staff_members_employee_id_number_key') {
            return [{ field: 'employee_id_number', message: 'This employee ID number is already in use.' }];
        }
        return [{ field: 'form', message: 'A staff member with similar unique properties already exists.' }];
    }
     if (dbError.code === '23503') { // foreign key violation
        if (dbError.message.includes('user_profiles')) {
             return [{ field: 'user_profile_id', message: 'User Profile ID does not exist.' }];
        }
    }
    return [{ field: 'database', message: dbError.message || 'A database error occurred.' }];
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const staffId = url.searchParams.get('id'); // UUID is string

    switch (req.method) {
      case 'POST': {
        const body = await req.json()
        const validationErrors = await validateStaffMemberData(body);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }

        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .insert([body])
          .select('*, user_profile:user_profiles(user_id, full_name, email:auth_users(email))') // Example join
          .single()

        if (error) {
            const parsedErrors = parseDbStaffErrorMessage(error);
            return new Response(JSON.stringify({ errors: parsedErrors }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.code === '23505' ? 409 : (error.code === '23503' ? 400 : 500),
            });
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 201,
        })
      }

      case 'GET': {
        let query = supabaseAdmin
          .from(TABLE_NAME)
          .select(`
            *,
            user_profile:user_profiles (user_id, full_name, job_title, avatar_url)
          `)
          // To get email, you might need a view or function if user_profiles doesn't store it
          // Or query auth.users separately if you have admin rights and it's a secure context.
          // Example: user_profile_id:user_profiles(user_id, full_name, email:auth_users(email)) - requires RLS setup on auth.users or security definer.

        if (staffId) {
          query = query.eq('id', staffId).single()
        } else {
          if (url.searchParams.has('staff_type')) query = query.eq('staff_type', url.searchParams.get('staff_type'))
          if (url.searchParams.has('is_active')) query = query.eq('is_active', url.searchParams.get('is_active') === 'true')
          query = query.order('last_name').order('first_name')
        }

        const { data, error } = await query

        if (error) {
            if (error.code === 'PGRST116' && staffId) {
                return new Response(JSON.stringify({ error: 'Staff Member not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            throw error;
        }
        if (staffId && !data) {
            return new Response(JSON.stringify({ error: 'Staff Member not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'PUT': {
        if (!staffId) {
          return new Response(JSON.stringify({ error: 'Staff Member ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }
        const body = await req.json()
        const validationErrors = await validateStaffMemberData(body, true, staffId);
        if (validationErrors.length > 0) {
          return new Response(JSON.stringify({ errors: validationErrors }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
          })
        }

        const { data, error } = await supabaseAdmin
          .from(TABLE_NAME)
          .update(body)
          .eq('id', staffId)
          .select('*, user_profile:user_profiles(user_id, full_name, email:auth_users(email))')
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Staff Member not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
                });
            }
            const parsedErrors = parseDbStaffErrorMessage(error);
            return new Response(JSON.stringify({ errors: parsedErrors }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: error.code === '23505' ? 409 : (error.code === '23503' ? 400 : 500),
            });
        }
        if (!data) {
             return new Response(JSON.stringify({ error: 'Staff Member not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      case 'DELETE': {
        if (!staffId) {
          return new Response(JSON.stringify({ error: 'Staff Member ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
          })
        }

        const { data: existing, error: fetchError } = await supabaseAdmin.from(TABLE_NAME).select('id').eq('id', staffId).single();
        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
        if (!existing) {
             return new Response(JSON.stringify({ error: 'Staff Member not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404,
            });
        }

        const { error } = await supabaseAdmin
          .from(TABLE_NAME)
          .delete()
          .eq('id', staffId)

        if (error) throw error // ON DELETE CASCADE handles departure_crew
        return new Response(JSON.stringify({message: "Staff Member deleted successfully"}), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200,
        })
      }

      default:
        return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405,
        })
    }
  } catch (error) {
    console.error('Error processing staff member request:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || (error.message?.includes('not found') ? 404 : 500),
    });
  }
})
