"use client";

import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { GameSession } from "@/types/game";
import { Skeleton } from "@/components/ui/skeleton";
import { Lobby } from "@/components/fun-space/tic-tac-toe/Lobby";
import { GameBoard } from "@/components/fun-space/tic-tac-toe/GameBoard";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, RefreshCw } from "lucide-react";

const fetchGameSession = async (sessionId: string): Promise<GameSession> => {
  const { data, error } = await supabase
    .from("game_sessions")
    .select("*, host:host_id(id, full_name), opponent:opponent_id(id, full_name)")
    .eq("id", sessionId)
    .single();
  if (error) throw new Error(error.message);
  return data as GameSession;
};

const TicTacToePage = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: session, isLoading, error } = useQuery<GameSession>({
    queryKey: ["gameSession", sessionId],
    queryFn: () => fetchGameSession(sessionId!),
    enabled: !!sessionId,
  });

  React.useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`game-session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
        (payload) => {
          queryClient.setQueryData(['gameSession', sessionId], payload.new);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, queryClient]);

  if (isLoading) return <Skeleton className="h-96 w-full max-w-md" />;
  if (error) return <p className="text-destructive">Error: {error.message}</p>;
  if (!session) return <p>Game session not found.</p>;

  const renderGameStatus = () => {
    if (session.status === 'completed') {
      let message = "It's a draw!";
      if (session.winner_id) {
        const winnerName = session.winner_id === session.host_id ? session.host?.full_name : session.opponent?.full_name;
        message = `${winnerName} wins!`;
      }
      return (
        <div className="text-center space-y-4">
          <Trophy className="h-16 w-16 mx-auto text-vibrant-gold" />
          <p className="text-2xl font-bold">{message}</p>
          <Button onClick={() => navigate('/dashboard/fun-space/games')}>Play Again</Button>
        </div>
      );
    }

    const isMyTurn = session.game_state.current_turn === user?.id;
    const opponentName = user?.id === session.host_id ? session.opponent?.full_name : session.host?.full_name;
    return (
      <div className="text-center">
        <p className="text-lg font-semibold">{isMyTurn ? "Your Turn" : `Waiting for ${opponentName}...`}</p>
        <p className="text-sm text-muted-foreground">You are "{user?.id === session.host_id ? 'X' : 'O'}"</p>
      </div>
    );
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Tic-Tac-Toe</span>
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/fun-space/games')}><RefreshCw className="h-4 w-4" /></Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {session.status === 'waiting' ? (
          <Lobby joinCode={session.join_code} />
        ) : (
          <>
            <div className="flex justify-between items-center font-semibold p-2 bg-muted rounded-md">
              <span>{session.host?.full_name} (X)</span>
              <Users className="h-5 w-5" />
              <span>{session.opponent?.full_name} (O)</span>
            </div>
            <GameBoard session={session} />
            <div className="mt-4">
              {renderGameStatus()}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TicTacToePage;