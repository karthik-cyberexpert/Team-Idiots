"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FileText, Trash2, Edit, Link as LinkIcon } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
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
import { Skeleton } from "@/components/ui/skeleton";

interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  profiles: {
    full_name: string;
  } | null;
  document_url?: string | null;
}

const fetchNotes = async (): Promise<Note[]> => {
  const { data, error } = await supabase
    .from("notes")
    .select(`
      *,
      profiles(full_name)
    `)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const deleteNote = async (id: string) => {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
};

interface NoteListProps {
  onSelectNote: (note: Note | null) => void;
}

export const NoteList = ({ onSelectNote }: NoteListProps) => {
  const queryClient = useQueryClient();
  const { data: notes, isLoading, error } = useQuery<Note[]>({
    queryKey: ["notes"],
    queryFn: fetchNotes,
  });

  const [noteToDelete, setNoteToDelete] = React.useState<string | null>(null);

  React.useEffect(() => {
    const channel = supabase
      .channel('public:notes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notes' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notes'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: deleteNote,
    onMutate: async (idToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["notes"] });
      const previousNotes = queryClient.getQueryData<Note[]>(["notes"]);

      queryClient.setQueryData<Note[]>(["notes"], (old) =>
        old?.filter((note) => note.id !== idToDelete)
      );

      setNoteToDelete(null); // Close dialog immediately
      return { previousNotes };
    },
    onSuccess: () => {
      showSuccess("Note deleted successfully.");
    },
    onError: (err, idToDelete, context) => {
      showError(err.message);
      queryClient.setQueryData(["notes"], context?.previousNotes); // Rollback
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] }); // Ensure fresh data
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error loading notes: {error.message}</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Your Notes</h2>
        <Button onClick={() => onSelectNote(null)}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Note
        </Button>
      </div>
      {notes && notes.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <Card key={note.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{note.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Created by: {note.profiles?.full_name || "Unknown User"}
                  <br />
                  Last updated: {new Date(note.updated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                {note.document_url ? (
                  <a
                    href={note.document_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center text-blue-600 hover:underline text-sm"
                  >
                    <LinkIcon className="h-4 w-4 mr-1" /> View Link
                  </a>
                ) : (
                  <p className="text-sm line-clamp-3">{note.content || "No content"}</p>
                )}
              </CardContent>
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onSelectNote(note)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setNoteToDelete(note.id)}>
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No notes yet. Start by creating a new one!</p>
        </div>
      )}

      <AlertDialog open={!!noteToDelete} onOpenChange={() => setNoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your note.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => noteToDelete && deleteMutation.mutate(noteToDelete)}
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