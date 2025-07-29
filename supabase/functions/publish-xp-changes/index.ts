import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch all profiles that have staged changes
    const { data: profiles, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('id, xp, staged_xp')
      .neq('staged_xp', 0);

    if (fetchError) throw fetchError;

    if (profiles && profiles.length > 0) {
      const updates = profiles.map(p => ({
        id: p.id,
        xp: Math.max(0, p.xp + p.staged_xp), // Ensure XP doesn't go below 0
        staged_xp: 0,
      }));

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .upsert(updates);

      if (updateError) throw updateError;
    }

    return new Response(
      JSON.stringify({ message: "XP changes published successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})