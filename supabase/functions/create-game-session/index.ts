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
    console.log("Function started.");
    const supabase = await getAuthenticatedClient(req);
    console.log("Authenticated client created.");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.log("User not authenticated, throwing error.");
      throw new Error("User not authenticated.");
    }
    console.log("User authenticated:", user.id);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    console.log("Admin client created.");

    let joinCode;
    let isUnique = false;
    while (!isUnique) {
      joinCode = Math.floor(100000 + Math.random() * 900000).toString();
      console.log("Attempting to generate unique join code:", joinCode);
      const { data: existing, error } = await supabaseAdmin.from('game_sessions').select('id').eq('join_code', joinCode).single();
      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is good for uniqueness check
        console.error("Error checking join code uniqueness:", error.message);
        throw error;
      }
      if (!existing) {
        isUnique = true;
        console.log("Unique join code generated:", joinCode);
      }
    }

    const initialGameState = {
      board: Array(9).fill(null),
      current_turn: user.id,
    };
    console.log("Initial game state prepared.");

    console.log("Attempting to insert new game session.");
    const { data: newSession, error } = await supabaseAdmin
      .from('game_sessions')
      .insert({
        game_type: 'tic-tac-toe',
        host_id: user.id,
        status: 'waiting',
        join_code: joinCode,
        game_state: initialGameState,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting new game session:", error.message);
      throw error;
    }
    console.log("New game session created:", newSession.id);

    return new Response(JSON.stringify(newSession), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("Caught error in function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})