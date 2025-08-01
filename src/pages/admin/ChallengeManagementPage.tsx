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
import { Terminal, PlusCircle, FileUp, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { EditChallengeDialog } from "./challenges/EditChallengeDialog";
import { AddChallengeDialog } from "./challenges/AddChallengeDialog";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import * as z from "zod";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

// Schema for bulk upload of multi-text typer challenges
const bulkMultiTyperChallengeSchema = z.object({
  challenge_title: z.string().min(1),
  challenge_description: z.string().optional(),
  xp_reward: z.number().int().min(0),
  game_points_reward: z.number().int().min(0),
  max_time_seconds: z.number().int().min(1),
  texts: z.array(z.object({
    header: z.string().min(1),
    code: z.string().min(10),
  })).min(1, "At least one text is required for a multi-text challenge."), // Changed from 25 to 1 for flexibility
});

const ChallengeManagementPage = () => {
  const queryClient = useQueryClient();
  const [challengeToDelete, setChallengeToDelete] = React.useState<string | null>(null);
  const [challengeToEdit, setChallengeToEdit] = React.useState<Challenge | null>(null);
  const [isAddChallengeDialogOpen, setIsAddChallengeDialogOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const { data: challenges, isLoading, error } = useQuery<Challenge[]>({
    queryKey: ["challenges"],
    queryFn: fetchChallenges,
  });

  // Real-time subscription for challenge changes
  React.useEffect(() => {
    const channel = supabase
      .channel('challenge-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'challenges' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['challenges'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  const bulkCreateMultiTyperChallengeMutation = useMutation({
    mutationFn: async (challengeData: z.infer<typeof bulkMultiTyperChallengeSchema>) => {
      const { error, data } = await supabase.functions.invoke("bulk-create-multi-typer-challenge", {
        body: challengeData,
      });
      if (error) throw new Error(error.message);
      if (data && data.error) {
        throw new Error(`Failed to create multi-typer challenge: ${data.error}`);
      }
      return data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || "Multi-text typer challenge uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result;
        if (typeof content !== 'string') {
          showError("Could not read file content.");
          return;
        }
        const jsonData = JSON.parse(content);

        const validatedData = bulkMultiTyperChallengeSchema.parse(jsonData);
        
        bulkCreateMultiTyperChallengeMutation.mutate(validatedData);

      } catch (error: any) {
        showError(`Failed to parse or validate JSON file: ${error.message || error}`);
      } finally {
        if (event.target) {
          event.target.value = ""; // Clear the file input
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

  const handleDownloadTemplate = (format: 'json' | 'csv' | 'xlsx') => {
    const templateData = {
      challenge_title: "My Awesome Multi-Text Challenge",
      challenge_description: "Complete these coding texts as fast as you can!",
      xp_reward: 100,
      game_points_reward: 50,
      max_time_seconds: 300, // 5 minutes
      texts: [
        { header: "Hello World in JS", code: "console.log('Hello, World!');" },
        { header: "Python Function", code: "def greet(name):\n  return f'Hello, {name}!'\n" },
        { header: "HTML Structure", code: "<!DOCTYPE html>\n<html>\n<head>\n  <title>Page</title>\n</head>\n<body>\n  <h1>My Page</h1>\n</body>\n</html>" },
      ],
    };

    if (format === 'json') {
      const jsonString = JSON.stringify(templateData, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      saveAs(blob, "multi_typer_challenge_template.json");
    } else if (format === 'csv') {
      // For CSV, we'll simplify and just include challenge metadata and text headers/codes
      const csvRows = [
        ["Field", "Value"],
        ["challenge_title", templateData.challenge_title],
        ["challenge_description", templateData.challenge_description || ""],
        ["xp_reward", templateData.xp_reward],
        ["game_points_reward", templateData.game_points_reward],
        ["max_time_seconds", templateData.max_time_seconds],
        ["", ""], // Separator
        ["Text Header", "Text Code"],
        ...templateData.texts.map(text => [`"${text.header.replace(/"/g, '""')}"`, `"${text.code.replace(/"/g, '""')}"`])
      ];
      const csvContent = csvRows.map(e => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      saveAs(blob, "multi_typer_challenge_template.csv");
    } else if (format === 'xlsx') {
      const ws1 = XLSX.utils.json_to_sheet([
        { Field: "challenge_title", Value: templateData.challenge_title },
        { Field: "challenge_description", Value: templateData.challenge_description || "" },
        { Field: "xp_reward", Value: templateData.xp_reward },
        { Field: "game_points_reward", Value: templateData.game_points_reward },
        { Field: "max_time_seconds", Value: templateData.max_time_seconds },
      ], { header: ["Field", "Value"] });

      const ws2 = XLSX.utils.json_to_sheet(templateData.texts, { header: ["header", "code"] });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, "Challenge Details");
      XLSX.utils.book_append_sheet(wb, ws2, "Typing Texts");
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      saveAs(blob, "multi_typer_challenge_template.xlsx");
    }
    showSuccess(`Multi-text challenge template downloaded as ${format.toUpperCase()}!`);
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
      <AddChallengeDialog open={isAddChallengeDialogOpen} onOpenChange={setIsAddChallengeDialogOpen} />
      <EditChallengeDialog open={!!challengeToEdit} onOpenChange={() => setChallengeToEdit(null)} challenge={challengeToEdit} />
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Challenge Management</h1>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
                  <Download className="mr-2 h-4 w-4" />
                  Download Multi-Text Template
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Download as</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownloadTemplate('json')}>JSON</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadTemplate('csv')}>CSV</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadTemplate('xlsx')}>XLSX</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleUploadClick} disabled={bulkCreateMultiTyperChallengeMutation.isPending} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
              <FileUp className="mr-2 h-4 w-4" />
              {bulkCreateMultiTyperChallengeMutation.isPending ? "Uploading..." : "Upload Multi-Text Typer Challenge"}
            </Button>
            <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <Button onClick={() => setIsAddChallengeDialogOpen(true)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Single Challenge
            </Button>
          </div>
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