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

const checkWinner = (board: (string | null)[]) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ];
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell !== null)) {
    return 'draw';
  }
  return null;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { sessionId, cellIndex } = await req.json();
    if (sessionId === undefined || cellIndex === undefined) {
      throw new Error("Session ID and cell index are required.");
    }

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
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) throw new Error("Game session not found.");
    if (session.status !== 'in_progress') throw new Error("Game is not in progress.");
    if (session.game_state.current_turn !== user.id) throw new Error("It's not your turn.");
    if (session.game_state.board[cellIndex] !== null) throw new Error("Cell is already taken.");

    const newBoard = [...session.game_state.board];
    const playerSymbol = user.id === session.host_id ? 'X' : 'O';
    newBoard[cellIndex] = playerSymbol;

    const winnerSymbol = checkWinner(newBoard);
    let newStatus = session.status;
    let winnerId = null;

    if (winnerSymbol) {
      newStatus = 'completed';
      if (winnerSymbol === 'X') winnerId = session.host_id;
      if (winnerSymbol === 'O') winnerId = session.opponent_id;
    }

    const nextTurn = user.id === session.host_id ? session.opponent_id : session.host_id;

    const { error: updateError } = await supabaseAdmin
      .from('game_sessions')
      .update({
        status: newStatus,
        winner_id: winnerId,
        game_state: {
          board: newBoard,
          current_turn: newStatus === 'completed' ? null : nextTurn,
        },
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})