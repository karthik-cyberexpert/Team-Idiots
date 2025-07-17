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

    const { sessionId } = await req.json();
    if (!sessionId) {
      throw new Error("Session ID is required.");
    }

    // Check if the session exists, is active, and has space
    const { data: session, error: sessionFetchError } = await supabase
      .from('game_sessions')
      .select('id, status, max_players')
      .eq('id', sessionId)
      .single();

    if (sessionFetchError || !session) {
      throw new Error("Session not found or not active.");
    }

    if (session.status === 'ended') {
      throw new Error("This session has ended.");
    }

    // Check current participant count
    const { count: currentParticipants, error: countError } = await supabase
      .from('game_session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (countError) {
      throw new Error(`Failed to count participants: ${countError.message}`);
    }

    if (session.max_players && currentParticipants! >= session.max_players) {
      throw new Error("Session is full. Cannot join.");
    }

    // Add the user as a participant
    const { error: participantError } = await supabase
      .from('game_session_participants')
      .insert({ session_id: sessionId, user_id: user.id });

    if (participantError) {
      if (participantError.code === '23505') { // Duplicate key error
        return new Response(
          JSON.stringify({ message: "Already joined this session." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`Failed to join session: ${participantError.message}`);
    }

    return new Response(
      JSON.stringify({ message: "Joined session successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})