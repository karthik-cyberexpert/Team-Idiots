"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gamepad2, Dice5 } from "lucide-react"; // Import Dice5 icon
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { showError } from "@/utils/toast";
import { JoinGameDialog } from "@/components/fun-space/tic-tac-toe/JoinGameDialog";
import { CreateLudoGameDialog } from "@/components/fun-space/ludo/CreateLudoGameDialog"; // Import Ludo dialogs
import { JoinLudoGameDialog } from "@/components/fun-space/ludo/JoinLudoGameDialog";

const createTicTacToeSession = async () => {
  const { data, error } = await supabase.functions.invoke("create-game-session");
  if (error) throw new Error(error.message);
  return data;
};

const createLudoSession = async () => {
  const { data, error } = await supabase.functions.invoke("create-ludo-session");
  if (error) throw new Error(error.message);
  return data;
};

const GamesPage = () => {
  const navigate = useNavigate();
  const [isTicTacToeJoinDialogOpen, setIsTicTacToeJoinDialogOpen] = React.useState(false);
  const [isCreateLudoDialogOpen, setIsCreateLudoDialogOpen] = React.useState(false);
  const [isJoinLudoDialogOpen, setIsJoinLudoDialogOpen] = React.useState(false);

  const createTicTacToeMutation = useMutation({
    mutationFn: createTicTacToeSession,
    onSuccess: (data) => {
      navigate(`/dashboard/fun-space/tic-tac-toe/${data.id}`);
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  const createLudoMutation = useMutation({
    mutationFn: createLudoSession,
    onSuccess: (data) => {
      navigate(`/dashboard/fun-space/ludo/${data.id}`);
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  return (
    <>
      <JoinGameDialog open={isTicTacToeJoinDialogOpen} onOpenChange={setIsTicTacToeJoinDialogOpen} />
      <CreateLudoGameDialog open={isCreateLudoDialogOpen} onOpenChange={setIsCreateLudoDialogOpen} />
      <JoinLudoGameDialog open={isJoinLudoDialogOpen} onOpenChange={setIsJoinLudoDialogOpen} />

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
              <Button className="w-full" onClick={() => createTicTacToeMutation.mutate()} disabled={createTicTacToeMutation.isPending}>
                {createTicTacToeMutation.isPending ? "Creating..." : "Start a Game"}
              </Button>
              <Button className="w-full" variant="outline" onClick={() => setIsTicTacToeJoinDialogOpen(true)}>
                Join a Game
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dice5 className="h-6 w-6 text-vibrant-green" />
                Ludo
              </CardTitle>
              <CardDescription>Roll the dice and race your tokens home! Up to 7 players.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-2">
              <Button className="w-full" onClick={() => setIsCreateLudoDialogOpen(true)} disabled={createLudoMutation.isPending}>
                {createLudoMutation.isPending ? "Creating..." : "Start a Game"}
              </Button>
              <Button className="w-full" variant="outline" onClick={() => setIsJoinLudoDialogOpen(true)}>
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