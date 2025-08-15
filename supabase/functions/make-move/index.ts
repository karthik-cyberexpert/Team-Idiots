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
    console.log("make-move: Function started.");
    const { sessionId, cellIndex } = await req.json();
    console.log(`make-move: Received sessionId: ${sessionId}, cellIndex: ${cellIndex}`);

    if (sessionId === undefined || cellIndex === undefined) {
      throw new Error("Session ID and cell index are required.");
    }

    const supabase = await getAuthenticatedClient(req);
    console.log("make-move: Authenticated client created.");
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.log("make-move: User not authenticated, throwing error.");
      throw new Error("User not authenticated.");
    }
    console.log("make-move: User authenticated:", user.id);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    console.log("make-move: Admin client created.");

    console.log(`make-move: Fetching game session ${sessionId}.`);
    const { data: session, error: fetchError } = await supabaseAdmin
      .from('game_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) {
      console.log(`make-move: Game session not found or fetch error: ${fetchError?.message}`);
      throw new Error("Game session not found.");
    }
    console.log("make-move: Game session fetched successfully.");
    console.log("make-move: Current session status:", session.status);
    console.log("make-move: Current turn:", session.game_state.current_turn);
    console.log("make-move: Board state:", session.game_state.board);

    if (session.status !== 'in_progress') throw new Error("Game is not in progress.");
    if (session.game_state.current_turn !== user.id) throw new Error("It's not your turn.");
    if (session.game_state.board[cellIndex] !== null) throw new Error("Cell is already taken.");

    const newBoard = [...session.game_state.board];
    const playerSymbol = user.id === session.host_id ? 'X' : 'O';
    newBoard[cellIndex] = playerSymbol;
    console.log(`make-move: Player ${user.id} made move at ${cellIndex} with symbol ${playerSymbol}. New board:`, newBoard);

    const winnerSymbol = checkWinner(newBoard);
    let newStatus = session.status;
    let winnerId = null;

    if (winnerSymbol) {
      newStatus = 'completed';
      if (winnerSymbol === 'X') winnerId = session.host_id;
      if (winnerSymbol === 'O') winnerId = session.opponent_id;
      console.log(`make-move: Winner detected: ${winnerSymbol}. New status: ${newStatus}, Winner ID: ${winnerId}`);
    } else {
      console.log("make-move: No winner yet.");
    }

    const nextTurn = newStatus === 'completed' ? null : (user.id === session.host_id ? session.opponent_id : session.host_id);
    console.log(`make-move: Next turn: ${nextTurn}`);

    console.log("make-move: Attempting to update game session.");
    const { error: updateError } = await supabaseAdmin
      .from('game_sessions')
      .update({
        status: newStatus,
        winner_id: winnerId,
        game_state: {
          board: newBoard,
          current_turn: nextTurn,
        },
      })
      .eq('id', sessionId);

    if (updateError) {
      console.log(`make-move: Error updating game session: ${updateError.message}`);
      throw updateError;
    }
    console.log("make-move: Game session updated successfully.");

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error("make-move: Caught error in function:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})