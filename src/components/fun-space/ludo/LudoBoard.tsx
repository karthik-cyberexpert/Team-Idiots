"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LudoSession, LudoParticipant } from "@/types/game";
import { Button } from "@/components/ui/button";
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6 } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface LudoBoardProps {
  session: LudoSession;
  participants: LudoParticipant[];
}

const rollDice = async (sessionId: string) => {
  const { data, error } = await supabase.functions.invoke("roll-ludo-dice", { body: { sessionId } });
  if (error) throw new Error(error.message);
  return data;
};

export const LudoBoard = ({ session, participants }: LudoBoardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const diceIcons = [Dice1, Dice2, Dice3, Dice4, Dice5, Dice6];
  const currentDiceRoll = session.game_state.dice || 1;
  const DiceIcon = diceIcons[currentDiceRoll - 1];

  const rollDiceMutation = useMutation({
    mutationFn: rollDice,
    onSuccess: (data) => {
      // The real-time subscription will handle invalidating and refetching
      console.log(data.message);
    },
    onError: (err: Error) => showError(err.message),
  });

  const isMyTurn = participants[session.current_player_index]?.profile?.id === user?.id;

  const playerColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="grid grid-cols-2 gap-4 w-full">
        {participants.map((p, index) => (
          <div key={p.user_id} className={cn(
            "p-3 rounded-lg flex items-center justify-between",
            playerColors[p.player_number],
            session.current_player_index === p.player_number ? "ring-4 ring-primary scale-105" : "opacity-70",
            "transition-all duration-300"
          )}>
            <span className="font-semibold text-white truncate">{p.profile?.full_name}</span>
            <span className="text-white font-bold">P{p.player_number + 1}</span>
          </div>
        ))}
      </div>

      <div className="relative w-48 h-48 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center shadow-inner">
        <DiceIcon className="h-24 w-24 text-primary animate-bounce-once" />
      </div>

      <Button
        onClick={() => rollDiceMutation.mutate(session.id)}
        disabled={!isMyTurn || rollDiceMutation.isPending}
        className="w-full"
      >
        {rollDiceMutation.isPending ? "Rolling..." : "Roll Dice"}
        <Dice5 className="ml-2 h-4 w-4" />
      </Button>

      <div className="text-center text-sm text-muted-foreground">
        <p>Current Dice Roll: {currentDiceRoll}</p>
        <p>It's {participants[session.current_player_index]?.profile?.full_name || 'someone'}'s turn.</p>
        <p className="mt-2">
          This is a basic Ludo board. Full game logic (moving pieces, capturing, winning) is not yet implemented.
        </p>
      </div>
    </div>
  );
};