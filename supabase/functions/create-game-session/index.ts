import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getSupabaseClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  return supabase
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = await getSupabaseClient(req);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error("User not authenticated.");
    }

    const { gameId } = await req.json();
    if (!gameId) {
      throw new Error("Game ID is required.");
    }

    // Create the game session
    const { data: sessionData, error: sessionError } = await supabase
      .from('game_sessions')
      .insert({ game_id: gameId, host_id: user.id, status: 'waiting' })
      .select()
      .single();

    if (sessionError) {
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    // Add the host as a participant
    const { error: participantError } = await supabase
      .from('game_session_participants')
      .insert({ session_id: sessionData.id, user_id: user.id });

    if (participantError) {
      // If participant insertion fails, try to delete the created session
      await supabase.from('game_sessions').delete().eq('id', sessionData.id);
      throw new Error(`Failed to add host to session: ${participantError.message}`);
    }

    return new Response(
      JSON.stringify({ message: "Session created successfully", session: sessionData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})