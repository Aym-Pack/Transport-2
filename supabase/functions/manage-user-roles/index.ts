import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Helper function to get user profile
async function getUserProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  if (error && error.code !== 'PGRST116') throw error // PGRST116 means no row was found
  return data || null
}

// Helper function to get user roles
async function getUserRoles(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('roles (id, name)') // Join with roles table to get role names
    .eq('user_id', userId)
  if (error) throw error
  return data ? data.map((ur: any) => ur.roles) : [] // Extract the role objects
}


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId')

    // Handle setting user roles
    if (req.method === 'PUT' && url.pathname.endsWith('/set-user-roles')) {
      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID (userId) is required for setting roles' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      const { role_ids } = await req.json()
      if (!Array.isArray(role_ids) || !role_ids.every(id => typeof id === 'number' || typeof id === 'bigint')) {
        return new Response(JSON.stringify({ error: 'role_ids must be an array of numbers/bigints' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      // "Transaction": Delete old, then insert new
      const { error: deleteError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId)

      if (deleteError) throw deleteError

      let newRolesData: any[] = [];
      if (role_ids.length > 0) {
        const newRoles = role_ids.map(rid => ({ user_id: userId, role_id: rid }))
        const { data, error: insertError } = await supabaseAdmin
          .from('user_roles')
          .insert(newRoles)
          .select('roles (id, name)') // Select the role details for the response

        if (insertError) throw insertError
        newRolesData = data ? data.map((ur: any) => ur.roles) : [];
      }

      return new Response(JSON.stringify({ message: 'User roles updated successfully', user_id: userId, roles: newRolesData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }


    // Handle GET requests for users
    if (req.method === 'GET') {
      if (userId) { // Get specific user
        const { data: { user }, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
        if (authError) {
          if (authError.message === 'User not found') { // Or check status code if available
            return new Response(JSON.stringify({ error: 'User not found in auth.users' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
          }
          throw authError
        }
        if (!user) {
           return new Response(JSON.stringify({ error: 'User not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
        }

        const profile = await getUserProfile(user.id)
        const roles = await getUserRoles(user.id)

        return new Response(JSON.stringify({ ...user, profile, roles }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })

      } else { // List all users with pagination
        const page = parseInt(url.searchParams.get('page') || '1', 10)
        const perPage = parseInt(url.searchParams.get('perPage') || '20', 10)

        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
        if (listError) throw listError

        const usersWithDetails = await Promise.all(
          users.map(async (user) => {
            const profile = await getUserProfile(user.id)
            const roles = await getUserRoles(user.id)
            return { ...user, profile, roles }
          })
        )

        // Note: listUsers also returns `aud` and other fields, which might not be needed.
        // We are primarily interested in the users array.
        // For full pagination details (total, etc.), you might need more from listUsers response if available
        // or make a separate count query. For now, just returning the list.
        return new Response(JSON.stringify(usersWithDetails), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }
    }

    // Default for unhandled methods
    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })

  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.status || (error.message === 'User not found' ? 404 : 500),
    })
  }
})
