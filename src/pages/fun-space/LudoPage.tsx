"use client";

import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LudoSession, LudoParticipant } from "@/types/game";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Dice5, Users, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { LudoLobby } from "@/components/fun-space/ludo/LudoLobby";
import { LudoBoard } from "@/components/fun-space/ludo/LudoBoard";

interface LudoGameData {
  session: LudoSession;
  participants: LudoParticipant[];
}

const fetchLudoSession = async (sessionId: string): Promise<LudoGameData> => {
  const { data, error } = await supabase.functions.invoke("get-ludo-session", { body: { sessionId } });
  if (error) throw new Error(error.message);
  return data;
};

const LudoPage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery<LudoGameData>({
    queryKey: ["ludoSession", sessionId],
    queryFn: () => fetchLudoSession(sessionId!),
    enabled: !!sessionId,
  });

  React.useEffect(() => {
    if (!sessionId) return;
    console.log(`Subscribing to ludo-session-${sessionId}`);
    const sessionChannel = supabase
      .channel(`ludo-session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ludo_sessions', filter: `id=eq.${sessionId}` },
        () => {
          console.log('Real-time update received for ludo session (sessions table):', sessionId);
          queryClient.invalidateQueries({ queryKey: ['ludoSession', sessionId] });
        }
      )
      .subscribe();

    const participantsChannel = supabase
      .channel(`ludo-participants-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ludo_participants', filter: `session_id=eq.${sessionId}` },
        () => {
          console.log('Real-time update received for ludo session (participants table):', sessionId);
          queryClient.invalidateQueries({ queryKey: ['ludoSession', sessionId] });
        }
      )
      .subscribe();

    return () => {
      console.log(`Unsubscribing from ludo-session-${sessionId}`);
      supabase.removeChannel(sessionChannel);
      supabase.removeChannel(participantsChannel);
    };
  }, [sessionId, queryClient]);

  if (isLoading) return <Skeleton className="h-96 w-full max-w-md" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!data?.session) return <p>Ludo session not found.</p>;

  const { session, participants } = data;
  const isHost = session.host_id === user?.id;
  const currentPlayer = participants[session.current_player_index];

  const renderGameStatus = () => {
    if (session.status === 'completed') {
      let message = "Game Over!";
      if (session.winner_id) {
        message = `${session.winner?.full_name || 'A player'} wins!`;
      }
      return (
        <div className="text-center space-y-4">
          <Trophy className="h-16 w-16 mx-auto text-vibrant-gold" />
          <p className="text-2xl font-bold">{message}</p>
          <Button onClick={() => navigate('/dashboard/fun-space/games')}>Play Again</Button>
        </div>
      );
    }

    if (session.status === 'in_progress') {
      const isMyTurn = currentPlayer?.profile?.id === user?.id;
      return (
        <div className="text-center">
          <p className="text-lg font-semibold">{isMyTurn ? "Your Turn!" : `Waiting for ${currentPlayer?.profile?.full_name || 'a player'}...`}</p>
          <p className="text-sm text-muted-foreground">Dice: {session.game_state.dice}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Ludo Game ({session.join_code})</span>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/fun-space/games')}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {session.status === 'waiting' ? (
          <LudoLobby session={session} participants={participants} isHost={isHost} />
        ) : (
          <>
            <div className="flex justify-between items-center font-semibold p-2 bg-muted rounded-md">
              <Users className="h-5 w-5 mr-2" />
              <span>Players: {participants.length}/{session.max_players}</span>
            </div>
            <LudoBoard session={session} participants={participants} />
            <div className="mt-4">
              {renderGameStatus()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LudoPage;