"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { showSuccess, showError } from "@/utils/toast";
import { FileUp } from "lucide-react";
import * as z from "zod";

// Define the schema for a single task within the bulk upload JSON
const bulkTaskSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional().nullable(),
  assignedToFullName: z.string().min(1, "Assigned user's full name is required."),
  dueDate: z.string().datetime({ message: "Due date must be a valid ISO 8601 datetime string (e.g., '2023-12-31T23:59:59Z')." }).optional().nullable(),
  // assignedByUserId will be added by the frontend based on the current admin user
});

// Define the schema for the entire JSON file (an array of tasks)
const bulkUploadSchema = z.array(bulkTaskSchema);

interface BulkUploadTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignedByUserId: string; // The ID of the admin performing the upload
}

export const BulkUploadTasksDialog = ({ open, onOpenChange, assignedByUserId }: BulkUploadTasksDialogProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const bulkCreateMutation = useMutation({
    mutationFn: async (tasks: z.infer<typeof bulkUploadSchema>) => {
      // Add assignedByUserId to each task before sending to the edge function
      const tasksWithAssigner = tasks.map(task => ({
        ...task,
        assignedByUserId: assignedByUserId,
      }));

      const { error, data } = await supabase.functions.invoke("bulk-create-tasks", {
        body: tasksWithAssigner,
      });
      if (error) throw new Error(error.message);
      if (data && data.error) {
        throw new Error(`Failed to bulk create tasks: ${data.error}`);
      }
      return data;
    },
    onSuccess: (data) => {
      showSuccess(data.message || "Tasks uploaded successfully!");
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      queryClient.invalidateQueries({ queryKey: ["userTasks"] });
      onOpenChange(false);
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
        
        // Validate the uploaded JSON against the schema
        const validatedData = bulkUploadSchema.parse(jsonData);
        
        bulkCreateMutation.mutate(validatedData);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Bulk Upload Tasks</DialogTitle>
          <DialogDescription>
            Upload a JSON file containing multiple tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            The JSON file should be an array of objects, each with `title`, `description` (optional), `assignedToFullName` (full name of the user), and `dueDate` (optional, ISO 8601 string).
          </p>
          <Button onClick={handleUploadClick} disabled={bulkCreateMutation.isPending}>
            <FileUp className="mr-2 h-4 w-4" />
            {bulkCreateMutation.isPending ? "Uploading..." : "Select JSON File"}
          </Button>
          <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};