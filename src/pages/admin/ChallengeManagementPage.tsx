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
  const { data, error } = await supabase.functions.invoke("delete-challenge", { body: { id } });
  if (error) {
    throw new Error(`Failed to delete challenge: ${error.message}`);
  }
  // Defensive check: if the edge function returns 2xx but with an error in the body
  if (data && data.error) {
    throw new Error(`Failed to delete challenge: ${data.error}`);
  }
};

// Updated schema for challenge JSON upload
const challengeUploadSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  content: z.string().min(10, "Code content is required for typer challenges."),
  xp_reward: z.number().int().min(0, "XP reward must be non-negative."),
  game_points_reward: z.number().int().min(0, "Game points reward must be non-negative."),
  wpm_goal: z.number().int().min(1, "WPM goal must be at least 1."),
  accuracy_goal: z.number().min(0).max(100, "Accuracy goal must be between 0 and 100."),
});
const jsonUploadSchema = z.array(challengeUploadSchema);

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

  // New mutation for bulk creating typer challenges
  const bulkCreateTyperChallengesMutation = useMutation({
    mutationFn: async (challengesData: z.infer<typeof jsonUploadSchema>) => {
      const { error, data } = await supabase.functions.invoke("bulk-create-typer-challenges", {
        body: challengesData,
      });
      if (error) throw new Error(error.message);
      if (data && data.error) {
        throw new Error(`Failed to bulk create typer challenges: ${data.error}`);
      }
      return data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || "Typer challenges uploaded and created successfully!");
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      queryClient.invalidateQueries({ queryKey: ["typingTexts"] }); // Invalidate typing texts as well
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
          showError("Invalid JSON format. Expected an array of objects with 'title', 'content', 'xp_reward', 'game_points_reward', 'wpm_goal', and 'accuracy_goal' keys.");
          return;
        }

        bulkCreateTyperChallengesMutation.mutate(validationResult.data);

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
          <Button onClick={handleUploadClick} variant="outline" disabled={bulkCreateTyperChallengesMutation.isPending}>
            <FileUp className="mr-2 h-4 w-4" />
            {bulkCreateTyperChallengesMutation.isPending ? "Uploading..." : "Upload For Challenge"}
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