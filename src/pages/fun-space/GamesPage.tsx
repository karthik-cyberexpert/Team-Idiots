"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { showError } from "@/utils/toast";
import { JoinGameDialog } from "@/components/fun-space/tic-tac-toe/JoinGameDialog";

const createGameSession = async () => {
  const { data, error } = await supabase.functions.invoke("create-game-session");
  if (error) throw new Error(error.message);
  return data;
};

const GamesPage = () => {
  const navigate = useNavigate();
  const [isJoinDialogOpen, setIsJoinDialogOpen] = React.useState(false);

  const createGameMutation = useMutation({
    mutationFn: createGameSession,
    onSuccess: (data) => {
      navigate(`/dashboard/fun-space/tic-tac-toe/${data.id}`);
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  return (
    <>
      <JoinGameDialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen} />
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Games</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-6 w-6 text-vibrant-blue" />
                Tic-Tac-Toe
              </CardTitle>
              <CardDescription>The classic game of X's and O's. Challenge a friend!</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Button className="w-full" onClick={() => createGameMutation.mutate()} disabled={createGameMutation.isPending}>
                {createGameMutation.isPending ? "Creating..." : "Start a Game"}
              </Button>
              <Button className="w-full" variant="outline" onClick={() => setIsJoinDialogOpen(true)}>
                Join a Game
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default GamesPage;