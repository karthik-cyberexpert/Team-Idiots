"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getColumns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { QuizSet } from "@/types/quiz";
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
import { ShowQuestionsDialog } from "./ShowQuestionsDialog";
import { BulkUploadQuizSetDialog } from "./BulkUploadQuizSetDialog";
import { EditQuizSetDialog } from "./EditQuizSetDialog"; // Import new dialog

const fetchQuizSets = async (): Promise<QuizSet[]> => {
  const { data, error } = await supabase.functions.invoke("get-quiz-sets");
  if (error) throw new Error(`Failed to fetch quiz sets: ${error.message}`);
  return data || [];
};

const QuizManagementPage = () => {
  const queryClient = useQueryClient();
  const [setToDelete, setSetToDelete] = React.useState<string | null>(null);
  const [setToShow, setSetToShow] = React.useState<QuizSet | null>(null);
  const [setToEdit, setSetToEdit] = React.useState<QuizSet | null>(null); // State for editing
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);

  const { data: quizSets, isLoading, error } = useQuery<QuizSet[]>({
    queryKey: ["quizSets"],
    queryFn: fetchQuizSets,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (variables: { id: string; status: 'published' | 'inactive' }) => {
      const { error } = await supabase.functions.invoke("update-quiz-set", { body: variables });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess("Set status updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["quizSets"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("delete-quiz-set", { body: { id } });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess("Set deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["quizSets"] });
      setSetToDelete(null);
    },
    onError: (err: Error) => {
      showError(err.message);
      setSetToDelete(null);
    },
  });

  const columns = React.useMemo(() => getColumns({
    onShowContent: (set) => setSetToShow(set),
    onUpdateStatus: (id, status) => updateStatusMutation.mutate({ id, status }),
    onDelete: (id) => setSetToDelete(id),
    onEdit: (set) => setSetToEdit(set), // Add onEdit handler
  }), [updateStatusMutation]);

  const suggestedTitle = `Quiz Week ${ (quizSets?.length || 0) + 1 }`;

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Quiz Management</h1>
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
      <ShowQuestionsDialog open={!!setToShow} onOpenChange={() => setSetToShow(null)} quizSet={setToShow} />
      <BulkUploadQuizSetDialog open={isUploadOpen} onOpenChange={setIsUploadOpen} suggestedTitle={suggestedTitle} />
      <EditQuizSetDialog open={!!setToEdit} onOpenChange={() => setSetToEdit(null)} quizSet={setToEdit} />
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Quiz Management</h1>
          <Button onClick={() => setIsUploadOpen(true)}>
            <FileUp className="mr-2 h-4 w-4" /> Upload Quiz Set
          </Button>
        </div>
        <DataTable columns={columns} data={quizSets || []} filterColumn="title" filterPlaceholder="Filter by title..." />
      </div>
      <AlertDialog open={!!setToDelete} onOpenChange={() => setSetToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the quiz set and all its questions.</AlertDialogDescription>
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

export default QuizManagementPage;