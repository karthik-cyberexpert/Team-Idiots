"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { showSuccess, showError } from "@/utils/toast";
import { MessageSquare, FileText } from "lucide-react";

const deleteAllChats = async () => {
  const { error } = await supabase.functions.invoke("delete-all-chats");
  if (error) {
    throw new Error(`Failed to delete chats: ${error.message}`);
  }
};

const deleteAllNotes = async () => {
  const { error } = await supabase.functions.invoke("delete-all-notes");
  if (error) {
    throw new Error(`Failed to delete notes: ${error.message}`);
  }
};

const DataManagementPage = () => {
  const queryClient = useQueryClient();
  const [confirmDeleteType, setConfirmDeleteType] = React.useState<"chats" | "notes" | null>(null);

  const deleteChatsMutation = useMutation({
    mutationFn: deleteAllChats,
    onSuccess: () => {
      showSuccess("All chat messages and channels deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["channels"] });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      setConfirmDeleteType(null);
    },
    onError: (err) => {
      showError(err.message);
      setConfirmDeleteType(null);
    },
  });

  const deleteNotesMutation = useMutation({
    mutationFn: deleteAllNotes,
    onSuccess: () => {
      showSuccess("All notes deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      setConfirmDeleteType(null);
    },
    onError: (err) => {
      showError(err.message);
      setConfirmDeleteType(null);
    },
  });

  const handleDelete = () => {
    if (confirmDeleteType === "chats") {
      deleteChatsMutation.mutate();
    } else if (confirmDeleteType === "notes") {
      deleteNotesMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Data Management</h1>
      <p className="text-muted-foreground mt-2">
        Use this section to clear application data that might consume storage space. This will not affect user accounts.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="group transform transition-transform-shadow duration-300 ease-in-out hover:scale-[1.01] hover:shadow-lg hover:rotate-x-0.5 hover:rotate-y-0.5 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Clear Chat Data</CardTitle>
            <MessageSquare className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Permanently delete all chat messages and channels from the database. This action cannot be undone.
            </CardDescription>
            <Button
              variant="destructive"
              onClick={() => setConfirmDeleteType("chats")}
              disabled={deleteChatsMutation.isPending}
              className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95"
            >
              {deleteChatsMutation.isPending ? "Deleting..." : "Delete All Chats"}
            </Button>
          </CardContent>
        </Card>

        <Card className="group transform transition-transform-shadow duration-300 ease-in-out hover:scale-[1.01] hover:shadow-lg hover:rotate-x-0.5 hover:rotate-y-0.5 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-lg font-medium">Clear Notes Data</CardTitle>
            <FileText className="h-6 w-6 text-primary" />
          </CardHeader>
          <CardContent>
            <CardDescription className="mb-4">
              Permanently delete all user notes from the database. This action cannot be undone.
            </CardDescription>
            <Button
              variant="destructive"
              onClick={() => setConfirmDeleteType("notes")}
              disabled={deleteNotesMutation.isPending}
              className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95"
            >
              {deleteNotesMutation.isPending ? "Deleting..." : "Delete All Notes"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!confirmDeleteType} onOpenChange={() => setConfirmDeleteType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete ALL {confirmDeleteType} data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleteChatsMutation.isPending || deleteNotesMutation.isPending}>
              {deleteChatsMutation.isPending || deleteNotesMutation.isPending ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DataManagementPage;