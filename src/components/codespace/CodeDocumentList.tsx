"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, Code, Trash2, Edit } from "lucide-react";
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
import { CodeDocument } from "@/types/codeDocument";

const fetchCodeDocuments = async (): Promise<CodeDocument[]> => {
  const { data, error } = await supabase
    .from("code_documents")
    .select(`
      *,
      profiles(full_name)
    `)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const deleteCodeDocument = async (id: string) => {
  const { data, error } = await supabase.functions.invoke("delete-code-document", {
    body: { id },
  });
  if (error) throw new Error(data.error);
  return data;
};

interface CodeDocumentListProps {
  onSelectDocument: (document: CodeDocument | null) => void;
}

export const CodeDocumentList = ({ onSelectDocument }: CodeDocumentListProps) => {
  const queryClient = useQueryClient();
  const { data: documents, isLoading, error } = useQuery<CodeDocument[]>({
    queryKey: ["codeDocuments"],
    queryFn: fetchCodeDocuments,
  });

  const [documentToDelete, setDocumentToDelete] = React.useState<string | null>(null);

  // Real-time subscription for code documents
  React.useEffect(() => {
    const channel = supabase
      .channel('public:code_documents')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'code_documents' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['codeDocuments'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: deleteCodeDocument,
    onMutate: async (idToDelete) => {
      await queryClient.cancelQueries({ queryKey: ["codeDocuments"] });
      const previousDocs = queryClient.getQueryData<CodeDocument[]>(["codeDocuments"]);

      queryClient.setQueryData<CodeDocument[]>(["codeDocuments"], (old) =>
        old?.filter((doc) => doc.id !== idToDelete)
      );

      setDocumentToDelete(null); // Close dialog immediately
      return { previousDocs };
    },
    onSuccess: () => {
      showSuccess("Code document deleted successfully.");
    },
    onError: (err, idToDelete, context) => {
      showError(err.message);
      queryClient.setQueryData(["codeDocuments"], context?.previousDocs); // Rollback
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["codeDocuments"] }); // Ensure fresh data
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
    return <div className="text-vibrant-red">Error loading documents: {error.message}</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-vibrant-purple dark:text-vibrant-pink">Shared Code Documents</h2>
        <Button onClick={() => onSelectDocument(null)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
          <PlusCircle className="mr-2 h-4 w-4" /> New Document
        </Button>
      </div>
      {documents && documents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex flex-col group transform transition-transform-shadow duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl hover:rotate-x-1 hover:rotate-y-1 shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">{doc.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Created by: <span className="text-vibrant-blue dark:text-vibrant-yellow">{doc.profiles?.full_name || "Unknown User"}</span>
                  <br />
                  Last updated: {new Date(doc.updated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto line-clamp-5">
                  <code className="text-foreground">{doc.content || "// No content"}</code>
                </pre>
              </CardContent>
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onSelectDocument(doc)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDocumentToDelete(doc.id)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <Code className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No code documents yet. Start by creating a new one!</p>
        </div>
      )}

      <AlertDialog open={!!documentToDelete} onOpenChange={() => setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your code document.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => documentToDelete && deleteMutation.mutate(documentToDelete)}
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