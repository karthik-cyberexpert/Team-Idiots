"use client";

import { Loader2, Copy, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { LudoSession, LudoParticipant } from "@/types/game";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface LudoLobbyProps {
  session: LudoSession;
  participants: LudoParticipant[];
  isHost: boolean;
}

const startLudoGame = async (sessionId: string) => {
  const { data, error } = await supabase.functions.invoke("start-ludo-game", { body: { sessionId } });
  if (error) throw new Error(error.message);
  return data;
};

export const LudoLobby = ({ session, participants, isHost }: LudoLobbyProps) => {
  const queryClient = useQueryClient();

  const startGameMutation = useMutation({
    mutationFn: startLudoGame,
    onSuccess: () => {
      showSuccess("Game started!");
      queryClient.invalidateQueries({ queryKey: ["ludoSession", session.id] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(session.join_code);
    showSuccess("Join code copied to clipboard!");
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name || name.trim() === '') return '??';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const playerColors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];

  return (
    <div className="text-center space-y-6 p-4">
      <h2 className="text-xl font-semibold">Waiting for Players...</h2>
      <p className="text-muted-foreground">Share this code with friends to have them join:</p>
      <div className="flex items-center justify-center gap-2">
        <p className="text-4xl font-bold tracking-widest bg-muted p-4 rounded-md">{session.join_code}</p>
        <Button variant="ghost" size="icon" onClick={handleCopy}>
          <Copy className="h-6 w-6" />
        </Button>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Participants ({participants.length}/{session.max_players})</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: session.max_players }).map((_, index) => {
            const participant = participants.find(p => p.player_number === index);
            return (
              <div key={index} className="flex flex-col items-center space-y-2">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${playerColors[index] || 'bg-gray-300'}`}>
                  {participant ? (
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={participant.profile?.avatar_url || undefined} />
                      <AvatarFallback className="text-xl text-white">
                        {getInitials(participant.profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <span className="text-white text-sm">Empty</span>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {participant ? participant.profile?.full_name : `Player ${index + 1}`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {isHost && (
        <Button
          className="w-full"
          onClick={() => startGameMutation.mutate(session.id)}
          disabled={startGameMutation.isPending || participants.length < 2}
        >
          {startGameMutation.isPending ? "Starting Game..." : "Start Game"}
          <Play className="ml-2 h-4 w-4" />
        </Button>
      )}
      {!isHost && (
        <div className="flex flex-col items-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Waiting for the host to start the game...</p>
        </div>
      )}
    </div>
  );
};