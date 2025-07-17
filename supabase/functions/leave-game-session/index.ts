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

    // Remove the user from the session participants
    const { error: deleteError } = await supabase
      .from('game_session_participants')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (deleteError) {
      throw new Error(`Failed to leave session: ${deleteError.message}`);
    }

    // Optional: If no participants left, delete the session (or mark as ended)
    const { count: remainingParticipants, error: countError } = await supabase
      .from('game_session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    if (countError) {
      console.error("Error counting remaining participants:", countError.message);
    } else if (remainingParticipants === 0) {
      const { error: endSessionError } = await supabase
        .from('game_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', sessionId);
      if (endSessionError) {
        console.error("Error ending session:", endSessionError.message);
      }
    }

    return new Response(
      JSON.stringify({ message: "Left session successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})