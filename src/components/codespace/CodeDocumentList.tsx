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
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
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

  const deleteMutation = useMutation({
    mutationFn: deleteCodeDocument,
    onSuccess: () => {
      showSuccess("Code document deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["codeDocuments"] });
      setDocumentToDelete(null);
    },
    onError: (err) => {
      showError(err.message);
      setDocumentToDelete(null);
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
    return <div className="text-red-500">Error loading documents: {error.message}</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Shared Code Documents</h2>
        <Button onClick={() => onSelectDocument(null)}>
          <PlusCircle className="mr-2 h-4 w-4" /> New Document
        </Button>
      </div>
      {documents && documents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Card key={doc.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{doc.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Created by: {doc.profiles?.full_name || "Unknown User"}
                  <br />
                  Last updated: {new Date(doc.updated_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <pre className="bg-muted p-2 rounded-md text-xs overflow-x-auto line-clamp-5">
                  <code>{doc.content || "// No content"}</code>
                </pre>
              </CardContent>
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onSelectDocument(doc)}>
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button variant="destructive" size="sm" onClick={() => setDocumentToDelete(doc.id)}>
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