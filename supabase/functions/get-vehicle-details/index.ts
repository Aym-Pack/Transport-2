import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { supabaseAdmin } from '../_shared/supabaseAdmin.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { vehicleId } = await req.json();
    if (!vehicleId) {
      return new Response(JSON.stringify({ error: 'Missing vehicleId parameter' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: vehicleData, error: vehicleError } = await supabaseAdmin
      .from('vehicles') // Assuming your table is named 'vehicles'
      .select('id, type, capacity, layout_config') // layout_config could be JSON for rows/cols
      .eq('id', vehicleId)
      .single();

    if (vehicleError) throw vehicleError;
    if (!vehicleData) throw new Error('Vehicle not found.');

    // For now, primarily returning capacity. Layout can be enhanced later.
    // If layout_config is null or not defined, a generic layout will be assumed by the client.
    return new Response(JSON.stringify(vehicleData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error fetching vehicle details:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Vehicle not found.' ? 404 : 400,
    });
  }
});
