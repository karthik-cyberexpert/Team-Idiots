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
import { Terminal, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { EditChallengeDialog } from "./challenges/EditChallengeDialog";
import * as z from "zod";

const fetchChallenges = async (): Promise<Challenge[]> => {
  const { data, error } = await supabase.functions.invoke("get-challenges");
  if (error) throw new Error(error.message);
  return data.data || [];
};

const deleteChallenge = async (id: string) => {
  const { error } = await supabase.functions.invoke("delete-challenge", { body: { id } });
  if (error) throw new Error(error.message);
};

const typingTextSchema = z.object({
  header: z.string().min(1, "Header is required."),
  code: z.string().min(10, "Code must be at least 10 characters."),
});
const jsonUploadSchema = z.array(typingTextSchema);

const ChallengeManagementPage = () => {
  const queryClient = useQueryClient();
  const [challengeToDelete, setChallengeToDelete] = React.useState<string | null>(null);
  const [challengeToEdit, setChallengeToEdit] = React.useState<Challenge | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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

  const bulkCreateMutation = useMutation({
    mutationFn: async (texts: { header: string; code: string }[]) => {
      const { error, data } = await supabase.functions.invoke("bulk-create-typing-texts", {
        body: texts,
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || "Texts for challenges uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["typingTexts"] });
      showSuccess("Next step is to convert these texts into a challenge.");
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          showError("Could not read file content.");
          return;
        }
        const jsonData = JSON.parse(content);
        const validationResult = jsonUploadSchema.safeParse(jsonData);

        if (!validationResult.success) {
          console.error(validationResult.error.flatten());
          showError("Invalid JSON format. Expected an array of objects with 'header' and 'code' keys.");
          return;
        }

        bulkCreateMutation.mutate(validationResult.data);

      } catch (error) {
        showError("Failed to parse JSON file. Please ensure it's a valid JSON.");
      } finally {
        if (event.target) {
          event.target.value = "";
        }
      }
    };
    reader.onerror = () => {
      showError("Error reading file.");
    };
    reader.readAsText(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

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
      <EditChallengeDialog open={!!challengeToEdit} onOpenChange={() => setChallengeToEdit(null)} challenge={challengeToEdit} />
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Challenge Management</h1>
          <Button onClick={handleUploadClick} variant="outline" disabled={bulkCreateMutation.isPending}>
            <FileUp className="mr-2 h-4 w-4" />
            {bulkCreateMutation.isPending ? "Uploading..." : "Upload For Challenge"}
          </Button>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
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