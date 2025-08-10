"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getColumns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { TyperSet } from "@/types/typer";
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
import { Terminal, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { ShowContentDialog } from "./ShowContentDialog";
import { BulkUploadTyperSetDialog } from "./BulkUploadTyperSetDialog";

const fetchTyperSets = async (): Promise<TyperSet[]> => {
  const { data, error } = await supabase.functions.invoke("get-typer-sets");
  if (error) throw new Error(`Failed to fetch typer sets: ${error.message}`);
  return data || [];
};

const TyperSetManagementPage = () => {
  const queryClient = useQueryClient();
  const [setToDelete, setSetToDelete] = React.useState<string | null>(null);
  const [setToShow, setSetToShow] = React.useState<TyperSet | null>(null);
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);

  const { data: typerSets, isLoading, error } = useQuery<TyperSet[]>({
    queryKey: ["typerSets"],
    queryFn: fetchTyperSets,
    refetchInterval: 1000, // Refetch every 1 second
  });

  const updateMutation = useMutation({
    mutationFn: async (variables: { id: string; status?: 'published' | 'inactive'; }) => {
      const { error } = await supabase.functions.invoke("update-typer-set", { body: variables });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess("Set updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["typerSets"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("delete-typer-set", { body: { id } });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess("Set deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["typerSets"] });
      setSetToDelete(null);
    },
    onError: (err: Error) => {
      showError(err.message);
      setSetToDelete(null);
    },
  });

  const columns = React.useMemo(() => getColumns({
    onShowContent: (set) => setSetToShow(set),
    onUpdateStatus: (id, status) => updateMutation.mutate({ id, status }),
    onDelete: (id) => setSetToDelete(id),
  }), [updateMutation]);

  const suggestedTitle = `Week ${ (typerSets?.length || 0) + 1 }`;

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Typer Set Management</h1>
          <Button disabled>Upload Set</Button>
        </div>
        <div className="space-y-2">
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
      <ShowContentDialog open={!!setToShow} onOpenChange={() => setSetToShow(null)} typerSet={setToShow} />
      <BulkUploadTyperSetDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} suggestedTitle={suggestedTitle} />
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Typer Set Management</h1>
          <Button onClick={() => setIsUploadOpen(true)}>
            <FileUp className="mr-2 h-4 w-4" /> Upload Set
          </Button>
        </div>
        <DataTable columns={columns} data={typerSets || []} filterColumn="title" filterPlaceholder="Filter by title..." />
      </div>
      <AlertDialog open={!!setToDelete} onOpenChange={() => setSetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the set and all its typing texts.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => setToDelete && deleteMutation.mutate(setToDelete!)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TyperSetManagementPage;