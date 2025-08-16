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
import { Textarea } from "@/components/ui/textarea";
import { showSuccess, showError } from "@/utils/toast";
import { Task } from "@/types/task";

const formSchema = z.object({
  reason: z.string().min(10, { message: "Please provide a reason of at least 10 characters." }),
});

type ReturnTaskFormValues = z.infer<typeof formSchema>;

const returnTask = async (values: { taskId: string; reason: string }) => {
  const { error } = await supabase.functions.invoke("return-task", {
    body: values,
  });
  if (error) {
    throw new Error(`Failed to return task: ${error.message}`);
  }
};

interface ReturnTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

export const ReturnTaskDialog = ({ open, onOpenChange, task }: ReturnTaskDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<ReturnTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: returnTask,
    onSuccess: () => {
      showSuccess("Task returned to user for revision.");
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      queryClient.invalidateQueries({ queryKey: ["userTasks"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: ReturnTaskFormValues) => {
    if (!task) return;
    mutation.mutate({ taskId: task.id, reason: values.reason });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Return Task: {task?.title}</DialogTitle>
          <DialogDescription>
            Provide a reason for returning this task. The user will be notified.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Returning</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., The submitted file is incorrect. Please upload the correct version." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Returning..." : "Confirm & Return"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};