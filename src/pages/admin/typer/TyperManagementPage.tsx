"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getColumns } from "./columns";
import { DataTable } from "@/components/ui/data-table";
import { TypingText } from "@/types/typing-text";
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
import { AddTypingTextDialog } from "./AddTypingTextDialog";
import { EditTypingTextDialog } from "./EditTypingTextDialog";

const fetchTypingTexts = async (): Promise<TypingText[]> => {
  const { data, error } = await supabase.functions.invoke("get-typing-texts");
  if (error) {
    throw new Error(`Failed to fetch typing texts: ${error.message}`);
  }
  return data.data || [];
};

const deleteTypingText = async (id: string) => {
  const { error } = await supabase.functions.invoke("delete-typing-text", {
    body: { id },
  });
  if (error) {
    throw new Error(`Failed to delete typing text: ${error.message}`);
  }
};

const TyperManagementPage = () => {
  const queryClient = useQueryClient();
  const [textToDelete, setTextToDelete] = React.useState<string | null>(null);
  const [textToEdit, setTextToEdit] = React.useState<TypingText | null>(null);
  const [isAddTextDialogOpen, setIsAddTextDialogOpen] = React.useState(false);

  const { data: typingTexts, isLoading, error } = useQuery<TypingText[]>({
    queryKey: ["typingTexts"],
    queryFn: fetchTypingTexts,
  });

  // Real-time subscription for typing_texts changes
  React.useEffect(() => {
    const channel = supabase
      .channel('typing-texts-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'typing_texts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['typingTexts'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: deleteTypingText,
    onSuccess: () => {
      showSuccess("Typing text deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["typingTexts"] });
      setTextToDelete(null);
    },
    onError: (err) => {
      showError(err.message);
      setTextToDelete(null);
    },
  });

  const handleDeleteRequest = React.useCallback((id: string) => {
    setTextToDelete(id);
  }, []);

  const handleEditRequest = React.useCallback((text: TypingText) => {
    setTextToEdit(text);
  }, []);

  const columns = React.useMemo(() => getColumns(handleDeleteRequest, handleEditRequest), [handleDeleteRequest, handleEditRequest]);

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Typer Management</h1>
          <Button disabled>Add New Text</Button>
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
      <AddTypingTextDialog open={isAddTextDialogOpen} onOpenChange={setIsAddTextDialogOpen} />
      <EditTypingTextDialog open={!!textToEdit} onOpenChange={() => setTextToEdit(null)} typingText={textToEdit} />
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Typer Management</h1>
          <Button onClick={() => setIsAddTextDialogOpen(true)}>Add New Text</Button>
        </div>
        <DataTable columns={columns} data={typingTexts || []} />
      </div>

      <AlertDialog open={!!textToDelete} onOpenChange={() => setTextToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the typing text.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => textToDelete && deleteMutation.mutate(textToDelete)}
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

export default TyperManagementPage;