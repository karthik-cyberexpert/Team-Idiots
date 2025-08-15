"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GameSession } from "@/types/game";
import { useAuth } from "@/contexts/AuthProvider";
import { cn } from "@/lib/utils";
import { showError } from "@/utils/toast";

const makeMove = async ({ sessionId, cellIndex }: { sessionId: string; cellIndex: number }) => {
  const { error } = await supabase.functions.invoke("make-move", { body: { sessionId, cellIndex } });
  if (error) throw new Error(error.message);
};

interface GameBoardProps {
  session: GameSession;
}

export const GameBoard = ({ session }: GameBoardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: makeMove,
    onError: (err: Error) => showError(err.message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gameSession", session.id] });
    },
  });

  const handleCellClick = (index: number) => {
    if (session.status !== 'in_progress' || session.game_state.current_turn !== user?.id || session.game_state.board[index] !== null) {
      return;
    }
    mutation.mutate({ sessionId: session.id, cellIndex: index });
  };

  return (
    <div className="grid grid-cols-3 gap-2 aspect-square max-w-sm mx-auto">
      {session.game_state.board.map((cell, index) => (
        <button
          key={index}
          onClick={() => handleCellClick(index)}
          className={cn(
            "flex items-center justify-center text-6xl font-bold rounded-md aspect-square",
            "bg-muted hover:bg-muted/80 transition-colors",
            cell === 'X' && "text-vibrant-blue",
            cell === 'O' && "text-vibrant-pink"
          )}
          disabled={session.status !== 'in_progress' || session.game_state.current_turn !== user?.id || cell !== null}
        >
          {cell}
        </button>
      ))}
    </div>
  );
};