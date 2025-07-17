"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Upload, XCircle, Users, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Game } from "@/types/game";
import { useAuth } from "@/contexts/AuthProvider";
import { AddGameDialog } from "./admin/games/AddGameDialog";
import { showSuccess, showError } from "@/utils/toast";
import { Separator } from "@/components/ui/separator";

interface GameSession {
  id: string;
  game_id: string;
  host_id: string;
  status: 'waiting' | 'playing' | 'ended';
  created_at: string;
  games: Game; // Joined game data
  profiles: { full_name: string } | null; // Host profile
}

interface SessionParticipant {
  user_id: string;
  profiles: { full_name: string } | null;
}

const fetchGames = async (): Promise<Game[]> => {
  const { data, error } = await supabase
    .from("games")
    .select(`
      *,
      profiles(full_name)
    `)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data.map(game => ({
    ...game,
    uploader_name: game.profiles?.full_name || 'Unknown',
  })) as Game[];
};

const fetchActiveSessions = async (): Promise<GameSession[]> => {
  const { data, error } = await supabase
    .from("game_sessions")
    .select(`
      id,
      game_id,
      host_id,
      status,
      created_at,
      games (id, title, file_url),
      profiles (full_name)
    `)
    .in('status', ['waiting', 'playing'])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as GameSession[];
};

const fetchSessionParticipants = async (sessionId: string): Promise<SessionParticipant[]> => {
  const { data, error } = await supabase
    .from("game_session_participants")
    .select(`
      user_id,
      profiles (full_name)
    `)
    .eq('session_id', sessionId);
  if (error) throw new Error(error.message);
  return data as SessionParticipant[];
};

const GroupGamesPage = () => {
  const { user, session, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = React.useState<GameSession | null>(null);
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = React.useState(false);
  const [sessionParticipants, setSessionParticipants] = React.useState<SessionParticipant[]>([]);

  const { data: games, isLoading: gamesLoading, error: gamesError } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: fetchGames,
  });

  const { data: activeSessions, isLoading: sessionsLoading, error: sessionsError } = useQuery<GameSession[]>({
    queryKey: ["activeSessions"],
    queryFn: fetchActiveSessions,
    refetchInterval: 5000, // Refetch active sessions every 5 seconds
  });

  const createSessionMutation = useMutation({
    mutationFn: async (gameId: string) => {
      const { data, error } = await supabase.functions.invoke("create-game-session", {
        body: { gameId },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data.session as GameSession;
    },
    onSuccess: (newSession) => {
      showSuccess("Game session created!");
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      setActiveSession(newSession);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const joinSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke("join-game-session", {
        body: { sessionId },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      showSuccess("Joined game session!");
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      queryClient.invalidateQueries({ queryKey: ["sessionParticipants", activeSession?.id] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const leaveSessionMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke("leave-game-session", {
        body: { sessionId },
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      showSuccess("Left game session.");
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
      setActiveSession(null);
      setSessionParticipants([]);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleCreateSession = (gameId: string) => {
    if (!user) {
      showError("You must be logged in to create a session.");
      return;
    }
    createSessionMutation.mutate(gameId);
  };

  const handleJoinSession = async (session: GameSession) => {
    if (!user) {
      showError("You must be logged in to join a session.");
      return;
    }
    await joinSessionMutation.mutateAsync(session.id);
    setActiveSession(session);
  };

  const handleLeaveSession = () => {
    if (activeSession) {
      leaveSessionMutation.mutate(activeSession.id);
    }
  };

  // Realtime subscription for participants
  React.useEffect(() => {
    if (!activeSession?.id) {
      setSessionParticipants([]);
      return;
    }

    const fetchAndSetParticipants = async () => {
      try {
        const participants = await fetchSessionParticipants(activeSession.id);
        setSessionParticipants(participants);
      } catch (err: any) {
        console.error("Error fetching participants:", err.message);
      }
    };

    fetchAndSetParticipants(); // Initial fetch

    const channel = supabase
      .channel(`game_session_participants:${activeSession.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_session_participants",
          filter: `session_id=eq.${activeSession.id}`,
        },
        (payload) => {
          // Invalidate query to refetch participants
          queryClient.invalidateQueries({ queryKey: ["sessionParticipants", activeSession.id] });
          fetchAndSetParticipants(); // Re-fetch participants on change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeSession?.id, queryClient]);

  if (authLoading || gamesLoading || sessionsLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Group Games</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (gamesError || sessionsError) {
    return <div className="text-red-500">Error loading data: {gamesError?.message || sessionsError?.message}</div>;
  }

  if (activeSession) {
    const gameUrl = activeSession.games?.file_url;
    const gameTitle = activeSession.games?.title;

    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Playing: {gameTitle}</h1>
          <Button variant="outline" onClick={handleLeaveSession} disabled={leaveSessionMutation.isPending}>
            <XCircle className="mr-2 h-4 w-4" /> Leave Session
          </Button>
        </div>
        <div className="flex-grow grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-4">
          <div className="border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
            {gameUrl ? (
              <iframe
                src={gameUrl}
                title={gameTitle || "Game"}
                className="w-full h-full border-none"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              ></iframe>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Game file not found.</div>
            )}
          </div>
          <Card className="flex flex-col">
            <CardHeader className="border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" /> Participants ({sessionParticipants.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow p-4 overflow-y-auto space-y-2">
              {sessionParticipants.length > 0 ? (
                sessionParticipants.map((participant, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                      {participant.profiles?.full_name ? participant.profiles.full_name[0].toUpperCase() : 'U'}
                    </div>
                    <span>{participant.profiles?.full_name || "Unknown User"}</span>
                    {participant.user_id === activeSession.host_id && <Badge variant="secondary">Host</Badge>}
                    {participant.user_id === user?.id && <Badge>You</Badge>}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-sm">No one else is in this session yet.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <AddGameDialog open={isAddGameDialogOpen} onOpenChange={setIsAddGameDialogOpen} />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Group Games</h1>
          {session && (
            <Button onClick={() => setIsAddGameDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Upload Game
            </Button>
          )}
        </div>

        <Separator />

        <h2 className="text-xl font-bold">Active Sessions</h2>
        {activeSessions && activeSessions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeSessions.map((sessionItem) => (
              <Card key={sessionItem.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{sessionItem.games?.title || "Unknown Game"}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Host: {sessionItem.profiles?.full_name || "Unknown"}
                    <br />
                    Status: {sessionItem.status.charAt(0).toUpperCase() + sessionItem.status.slice(1)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm line-clamp-3">{sessionItem.games?.description || "No description provided."}</p>
                </CardContent>
                <div className="p-4 border-t flex justify-end">
                  <Button size="sm" onClick={() => handleJoinSession(sessionItem)} disabled={joinSessionMutation.isPending}>
                    <PlayCircle className="h-4 w-4 mr-2" /> Join Session
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">No active game sessions. Be the first to create one!</p>
          </div>
        )}

        <Separator />

        <h2 className="text-xl font-bold">Available Games</h2>
        {games && games.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <Card key={game.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{game.title}</CardTitle>
                  <CardDescription className="text-sm text-muted-foreground">
                    Uploaded by: {game.uploader_name}
                    <br />
                    Uploaded on: {new Date(game.created_at).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <p className="text-sm line-clamp-3">{game.description || "No description provided."}</p>
                </CardContent>
                <div className="p-4 border-t flex justify-end">
                  <Button size="sm" onClick={() => handleCreateSession(game.id)} disabled={createSessionMutation.isPending}>
                    <PlayCircle className="h-4 w-4 mr-2" /> Create Session
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-10">
            <CardHeader>
              <Gamepad2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <CardTitle className="text-lg">No Games Available Yet</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                {session ? "Be the first to upload a game!" : "Log in to upload and play games."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Future game listings or features will go here */}
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
};

export default GroupGamesPage;