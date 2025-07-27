"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";
import { Task } from "@/types/task";

const formSchema = z.object({
  marksAwarded: z.coerce.number().int().min(0).max(10, { message: "Marks must be between 0 and 10." }),
  xpAwarded: z.coerce.number().int().min(0, { message: "XP awarded must be a non-negative number." }),
});

type AwardMarksAndXpFormValues = z.infer<typeof formSchema>;

const updateTaskCompletionDetails = async (values: AwardMarksAndXpFormValues & { taskId: string }) => {
  const { error } = await supabase.functions.invoke("update-task-completion-details", {
    body: values,
  });
  if (error) {
    throw new Error(`Failed to update task completion details: ${error.message}`);
  }
};

interface AwardMarksAndXpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

export const AwardMarksAndXpDialog = ({ open, onOpenChange, task }: AwardMarksAndXpDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<AwardMarksAndXpFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      marksAwarded: 10, // Default to 10 marks
      xpAwarded: 10, // Default XP award
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({
        marksAwarded: 10,
        xpAwarded: 10,
      });
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: updateTaskCompletionDetails,
    onSuccess: () => {
      showSuccess("Task approved and XP/marks awarded successfully.");
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      queryClient.invalidateQueries({ queryKey: ["userTasks"] });
      queryClient.invalidateQueries({ queryKey: ["xpHistory"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["users"] }); // To update XP in admin user list
      onOpenChange(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: AwardMarksAndXpFormValues) => {
    if (!task) return;
    mutation.mutate({ ...values, taskId: task.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Approve Task: {task?.title}</DialogTitle>
          <DialogDescription>
            Award marks and XP for the completed task.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="marksAwarded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Marks (out of 10)</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" max="10" placeholder="e.g., 10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="xpAwarded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>XP Awarded</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="e.g., 10" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Awarding..." : "Confirm & Award"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};