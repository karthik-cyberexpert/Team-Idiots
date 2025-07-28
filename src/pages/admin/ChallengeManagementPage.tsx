"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getColumns } from "./challenges/columns";
import { DataTable } from "@/components/ui/data-table";
import { Challenge } from "@/types/challenge";
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
import { AddChallengeDialog } from "./challenges/AddChallengeDialog";
import { EditChallengeDialog } from "./challenges/EditChallengeDialog";

const fetchChallenges = async (): Promise<Challenge[]> => {
  const { data, error } = await supabase.functions.invoke("get-challenges");
  if (error) throw new Error(error.message);
  return data.data || [];
};

const deleteChallenge = async (id: string) => {
  const { error } = await supabase.functions.invoke("delete-challenge", { body: { id } });
  if (error) throw new Error(error.message);
};

const ChallengeManagementPage = () => {
  const queryClient = useQueryClient();
  const [challengeToDelete, setChallengeToDelete] = React.useState<string | null>(null);
  const [challengeToEdit, setChallengeToEdit] = React.useState<Challenge | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);

  const { data: challenges, isLoading, error } = useQuery<Challenge[]>({
    queryKey: ["challenges"],
    queryFn: fetchChallenges,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteChallenge,
    onSuccess: () => {
      showSuccess("Challenge deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      setChallengeToDelete(null);
    },
    onError: (err) => {
      showError(err.message);
      setChallengeToDelete(null);
    },
  });

  const columns = React.useMemo(() => getColumns(setChallengeToDelete, setChallengeToEdit), []);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
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
      <AddChallengeDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
      <EditChallengeDialog open={!!challengeToEdit} onOpenChange={() => setChallengeToEdit(null)} challenge={challengeToEdit} />
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Challenge Management</h1>
          <Button onClick={() => setIsAddDialogOpen(true)}>Add Challenge</Button>
        </div>
        <DataTable columns={columns} data={challenges || []} />
      </div>
      <AlertDialog open={!!challengeToDelete} onOpenChange={() => setChallengeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the challenge.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => challengeToDelete && deleteMutation.mutate(challengeToDelete)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ChallengeManagementPage;