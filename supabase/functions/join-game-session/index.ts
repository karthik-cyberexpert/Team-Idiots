import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { joinCode } = await req.json();
    if (!joinCode) throw new Error("Join code is required.");

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: session, error: fetchError } = await supabaseAdmin
      .from('game_sessions')
      .select('*')
      .eq('join_code', joinCode)
      .eq('status', 'waiting')
      .single();

    if (fetchError || !session) throw new Error("Game not found or already started.");
    if (session.host_id === user.id) throw new Error("You cannot join your own game.");

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('game_sessions')
      .update({ opponent_id: user.id, status: 'in_progress' })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updatedSession), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})