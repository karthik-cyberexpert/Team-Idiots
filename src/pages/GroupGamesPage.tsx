"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Gamepad2, Upload, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Game } from "@/types/game";
import { useAuth } from "@/contexts/AuthProvider";
import { AddGameDialog } from "./admin/games/AddGameDialog"; // Re-using the admin dialog

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

const GroupGamesPage = () => {
  const { session, loading: authLoading } = useAuth();
  const [selectedGameUrl, setSelectedGameUrl] = React.useState<string | null>(null);
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = React.useState(false);

  const { data: games, isLoading, error } = useQuery<Game[]>({
    queryKey: ["games"],
    queryFn: fetchGames,
  });

  if (authLoading || isLoading) {
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

  if (error) {
    return <div className="text-red-500">Error loading games: {error.message}</div>;
  }

  if (selectedGameUrl) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Playing Game</h1>
          <Button variant="outline" onClick={() => setSelectedGameUrl(null)}>
            <XCircle className="mr-2 h-4 w-4" /> Close Game
          </Button>
        </div>
        <div className="flex-grow border rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900">
          <iframe
            src={selectedGameUrl}
            title="Game"
            className="w-full h-full border-none"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          ></iframe>
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
                  <Button size="sm" onClick={() => setSelectedGameUrl(game.file_url)}>
                    <Gamepad2 className="h-4 w-4 mr-2" /> Play Game
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