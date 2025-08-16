import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error("Missing Authorization header.");
  }
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
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required.");

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: session, error: fetchError } = await supabaseAdmin
      .from('ludo_sessions')
      .select('host_id, status, max_players')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) throw new Error("Game session not found.");
    if (session.host_id !== user.id) throw new Error("Only the host can start the game.");
    if (session.status !== 'waiting') throw new Error("Game has already started or ended.");

    // Check if minimum players are met (e.g., at least 2)
    const { count: currentParticipants, error: countError } = await supabaseAdmin
      .from('ludo_participants')
      .select('user_id', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (countError) throw countError;
    if (currentParticipants && currentParticipants < 2) { // Minimum 2 players to start
      throw new Error("At least 2 players are required to start the game.");
    }

    const { data: updatedSession, error: updateError } = await supabaseAdmin
      .from('ludo_sessions')
      .update({ status: 'in_progress', current_player_index: 0 }) // Start with player 0
      .eq('id', sessionId)
      .select()
      .single();

    if (updateError) throw updateError;

    return new Response(JSON.stringify(updatedSession), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})