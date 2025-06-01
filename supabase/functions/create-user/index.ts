import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, job_title } = await req.json();

    // Create user in auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Optionally auto-confirm email
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed in auth.');


    const userId = authData.user.id;

    // Insert into user_profiles
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({ user_id: userId, full_name, job_title });

    if (profileError) {
      // If profile insertion fails, ideally, you might want to delete the auth user as well
      // For simplicity here, we're just throwing the error.
      // Consider implementing a rollback mechanism in a real-world scenario.
      await supabaseAdmin.auth.admin.deleteUser(userId); // Attempt to clean up auth user
      throw profileError;
    }

    return new Response(JSON.stringify({ message: 'User created successfully', userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
