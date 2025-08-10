"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileText, Link as LinkIcon, Terminal } from "lucide-react";
import { Submission } from "@/types/task";
import { Button } from "../ui/button";

const fetchSubmissionDetails = async (taskId: string): Promise<Submission | null> => {
  const { data, error } = await supabase.functions.invoke("get-submission-details", {
    body: { taskId },
  });
  if (error) throw new Error(error.message);
  return data;
};

interface ViewSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string | null;
}

export const ViewSubmissionDialog = ({ open, onOpenChange, taskId }: ViewSubmissionDialogProps) => {
  const { data: submission, isLoading, error } = useQuery<Submission | null>({
    queryKey: ["submissionDetails", taskId],
    queryFn: () => fetchSubmissionDetails(taskId!),
    enabled: !!taskId && open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submission for: {submission?.tasks.title || "..."}</DialogTitle>
          <DialogDescription>
            Here are the details of the submission.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : error ? (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : submission ? (
            <>
              {submission.content && (
                <div>
                  <h4 className="font-semibold mb-2">Submitted Text:</h4>
                  <div className="p-4 border rounded-md bg-muted/50 max-h-48 overflow-y-auto">
                    <p className="text-sm whitespace-pre-wrap">{submission.content}</p>
                  </div>
                </div>
              )}
              {submission.file_url && (
                <div>
                  <h4 className="font-semibold mb-2">Submitted File:</h4>
                  <Button asChild variant="outline">
                    <a href={submission.file_url} target="_blank" rel="noopener noreferrer">
                      <LinkIcon className="mr-2 h-4 w-4" />
                      View Submitted File
                    </a>
                  </Button>
                </div>
              )}
              {!submission.content && !submission.file_url && (
                <p className="text-sm text-muted-foreground">No content or file was submitted.</p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No submission found for this task.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};