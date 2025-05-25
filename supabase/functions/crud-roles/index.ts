import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const roleId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null;

    // Special endpoint for setting permissions
    if (req.method === 'PUT' && url.pathname.endsWith('/set-permissions')) {
      if (!roleId) {
        return new Response(JSON.stringify({ error: 'Role ID is required for setting permissions' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }
      const { permission_ids } = await req.json()
      if (!Array.isArray(permission_ids) || !permission_ids.every(id => typeof id === 'number' || typeof id === 'bigint')) {
        return new Response(JSON.stringify({ error: 'permission_ids must be an array of numbers/bigints' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        })
      }

      // "Transaction": Delete old, then insert new
      const { error: deleteError } = await supabaseAdmin
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      if (deleteError) throw deleteError

      if (permission_ids.length > 0) {
        const newPermissions = permission_ids.map(pid => ({ role_id: roleId, permission_id: pid }))
        const { error: insertError } = await supabaseAdmin
          .from('role_permissions')
          .insert(newPermissions)
        
        if (insertError) throw insertError
      }

      return new Response(JSON.stringify({ message: 'Permissions updated successfully', role_id: roleId, permission_ids }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }


    // Standard CRUD for roles
    switch (req.method) {
      case 'POST': { // Create Role
        const { name, description } = await req.json()
        if (!name) {
          return new Response(JSON.stringify({ error: 'Missing required field: name' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const { data, error } = await supabaseAdmin
          .from('roles')
          .insert([{ name, description }])
          .select()
          .single()

        if (error) throw error
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        })
      }

      case 'GET': { // Read Role(s)
        if (roleId) { // Get by ID with permissions
          const { data: roleData, error: roleError } = await supabaseAdmin
            .from('roles')
            .select('*')
            .eq('id', roleId)
            .single()
          
          if (roleError) {
            if (roleError.code === 'PGRST116') { // Not found
                return new Response(JSON.stringify({ error: 'Role not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                });
            }
            throw roleError;
          }
          if (!roleData) { // Should be caught by PGRST116 but as a safeguard
            return new Response(JSON.stringify({ error: 'Role not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
          }

          const { data: permissionsData, error: permError } = await supabaseAdmin
            .from('role_permissions')
            .select('permission_id')
            .eq('role_id', roleId)
          
          if (permError) throw permError

          const permission_ids = permissionsData ? permissionsData.map(p => p.permission_id) : []
          
          return new Response(JSON.stringify({ ...roleData, permission_ids }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })

        } else { // List all roles
          const { data, error } = await supabaseAdmin.from('roles').select('*').order('name')
          if (error) throw error
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        }
      }

      case 'PUT': { // Update Role Details (not permissions)
        if (!roleId) {
          return new Response(JSON.stringify({ error: 'Role ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const { name, description } = await req.json()
        if (!name && description === undefined) {
          return new Response(JSON.stringify({ error: 'Missing fields to update: name or description' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const updatePayload: { name?: string; description?: string } = {}
        if (name) updatePayload.name = name
        if (description !== undefined) updatePayload.description = description

        const { data, error } = await supabaseAdmin
          .from('roles')
          .update(updatePayload)
          .eq('id', roleId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return new Response(JSON.stringify({ error: 'Role not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                });
            }
            throw error;
        }
        if (!data) { // Should be caught by PGRST116
            return new Response(JSON.stringify({ error: 'Role not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      case 'DELETE': { // Delete Role
        if (!roleId) {
          return new Response(JSON.stringify({ error: 'Role ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data: existingRole, error: fetchError } = await supabaseAdmin
            .from('roles')
            .select('id')
            .eq('id', roleId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        if (!existingRole && !fetchError) {
             return new Response(JSON.stringify({ error: 'Role not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }
        
        // ON DELETE CASCADE should handle role_permissions and user_roles
        const { error } = await supabaseAdmin
          .from('roles')
          .delete()
          .eq('id', roleId)

        if (error) {
            // Example: FK constraint error if ON DELETE CASCADE wasn't set (though it should be)
            if (error.code === '23503') { 
                return new Response(JSON.stringify({ error: 'Cannot delete role: it is still referenced by other tables that do not have ON DELETE CASCADE configured.' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 409, // Conflict
                });
            }
            throw error;
        }
        return new Response(null, {
          headers: { ...corsHeaders },
          status: 204, // No Content
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
