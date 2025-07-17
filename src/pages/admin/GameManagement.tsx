"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getColumns } from "./games/columns";
import { DataTable } from "@/components/ui/data-table";
import { Game } from "@/types/game";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { AddGameDialog } from "./games/AddGameDialog";
import { EditGameDialog } from "./games/EditGameDialog";

interface PaginatedGamesResponse {
  games: Game[];
  totalCount: number; // Although get-games doesn't return totalCount, DataTable expects it. We'll adjust if needed.
}

const fetchGames = async (): Promise<PaginatedGamesResponse> => {
  const { data, error } = await supabase.functions.invoke("get-games");
  if (error) {
    throw new Error(`Failed to fetch games: ${error.message}`);
  }
  // Assuming get-games returns { games: Game[] }
  return { games: data.games || [], totalCount: data.games?.length || 0 };
};

const deleteGame = async (gameId: string) => {
  const { error } = await supabase.functions.invoke("delete-game", {
    body: { gameId },
  });
  if (error) {
    throw new Error(`Failed to delete game: ${error.message}`);
  }
};

const GameManagement = () => {
  const queryClient = useQueryClient();
  const [gameToDelete, setGameToDelete] = React.useState<string | null>(null);
  const [gameToEdit, setGameToEdit] = React.useState<Game | null>(null);
  const [isAddGameDialogOpen, setIsAddGameDialogOpen] = React.useState(false);

  const { data, isLoading, error } = useQuery<PaginatedGamesResponse>({
    queryKey: ["games"],
    queryFn: fetchGames,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteGame,
    onSuccess: () => {
      showSuccess("Game deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["games"] });
      setGameToDelete(null);
    },
    onError: (err) => {
      showError(err.message);
      setGameToDelete(null);
    },
  });

  const handleDeleteRequest = React.useCallback((gameId: string) => {
    setGameToDelete(gameId);
  }, []);

  const handleEditRequest = React.useCallback((game: Game) => {
    setGameToEdit(game);
  }, []);

  const columns = React.useMemo(() => getColumns(handleDeleteRequest, handleEditRequest), [handleDeleteRequest, handleEditRequest]);

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Game Management</h1>
          <Button disabled>Add Game</Button>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <AddGameDialog open={isAddGameDialogOpen} onOpenChange={setIsAddGameDialogOpen} />
      <EditGameDialog open={!!gameToEdit} onOpenChange={() => setGameToEdit(null)} game={gameToEdit} />
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Game Management</h1>
          <Button onClick={() => setIsAddGameDialogOpen(true)}>Add Game</Button>
        </div>
        <DataTable
          columns={columns}
          data={data?.games || []}
          // For simplicity, assuming no pagination for now, or totalCount from get-games
          pageCount={1} // Adjust if get-games returns actual pagination data
          pagination={{ pageIndex: 0, pageSize: 10 }} // Dummy pagination state
          setPagination={() => {}} // Dummy setPagination
        />
      </div>

      <AlertDialog open={!!gameToDelete} onOpenChange={() => setGameToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the game
              and its associated file from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => gameToDelete && deleteMutation.mutate(gameToDelete)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default GameManagement;