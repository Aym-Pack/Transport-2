import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const permissionId = url.searchParams.get('id') ? BigInt(url.searchParams.get('id')!) : null;

    switch (req.method) {
      case 'POST': { // Create Permission
        const { action, description } = await req.json()
        if (!action) {
          return new Response(JSON.stringify({ error: 'Missing required field: action' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const { data, error } = await supabaseAdmin
          .from('permissions')
          .insert([{ action, description }])
          .select()
          .single()

        if (error) {
          if (error.code === '23505') { // unique_violation for action
            return new Response(JSON.stringify({ error: 'Permission action must be unique.' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 409, // Conflict
            });
          }
          throw error;
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        })
      }

      case 'GET': { // Read Permission(s)
        if (permissionId) { // Get by ID
          const { data, error } = await supabaseAdmin
            .from('permissions')
            .select('*')
            .eq('id', permissionId)
            .single()
          
          if (error) {
             if (error.code === 'PGRST116') { // Not found
                return new Response(JSON.stringify({ error: 'Permission not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                });
            }
            throw error;
          }
           if (!data) { // Should be caught by PGRST116
            return new Response(JSON.stringify({ error: 'Permission not found' }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 404,
            })
          }
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        } else { // List all permissions
          const { data, error } = await supabaseAdmin.from('permissions').select('*').order('action')
          if (error) throw error
          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          })
        }
      }

      case 'PUT': { // Update Permission
        if (!permissionId) {
          return new Response(JSON.stringify({ error: 'Permission ID is required for update' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }
        const { action, description } = await req.json()
        if (!action && description === undefined) {
          return new Response(JSON.stringify({ error: 'Missing fields to update: action or description' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const updatePayload: { action?: string; description?: string } = {}
        if (action) updatePayload.action = action
        if (description !== undefined) updatePayload.description = description

        const { data, error } = await supabaseAdmin
          .from('permissions')
          .update(updatePayload)
          .eq('id', permissionId)
          .select()
          .single()

        if (error) {
            if (error.code === 'PGRST116') { 
                return new Response(JSON.stringify({ error: 'Permission not found' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 404,
                });
            }
            if (error.code === '23505') { // unique_violation for action
                return new Response(JSON.stringify({ error: 'Permission action must be unique.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 409, // Conflict
                });
            }
            throw error;
        }
        if (!data) { // Should be caught by PGRST116
            return new Response(JSON.stringify({ error: 'Permission not found or no changes made' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            })
        }
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      case 'DELETE': { // Delete Permission
        if (!permissionId) {
          return new Response(JSON.stringify({ error: 'Permission ID is required for delete' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          })
        }

        const { data: existingPerm, error: fetchError } = await supabaseAdmin
            .from('permissions')
            .select('id')
            .eq('id', permissionId)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        if (!existingPerm && !fetchError) {
             return new Response(JSON.stringify({ error: 'Permission not found' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 404,
            });
        }

        // ON DELETE CASCADE should handle role_permissions
        const { error } = await supabaseAdmin
          .from('permissions')
          .delete()
          .eq('id', permissionId)

        if (error) {
             // Example: FK constraint error if ON DELETE CASCADE wasn't set on role_permissions (though it should be)
            if (error.code === '23503') { 
                return new Response(JSON.stringify({ error: 'Cannot delete permission: it is still referenced by role_permissions table and ON DELETE CASCADE is not working.' }), {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 409, // Conflict
                });
            }
            throw error;
        }
        return new Response(JSON.stringify({ message: 'Permission deleted successfully' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Or 204 No Content if no message body is preferred
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
