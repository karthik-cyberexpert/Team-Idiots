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
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { Task } from "@/types/task";

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
  customXpAward: z.coerce.number().int().min(0, { message: "XP must be a positive number." }).optional().nullable(),
  customDueDays: z.coerce.number().int().min(0, { message: "Due days must be a positive number." }).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.customDueDays !== null && data.customDueDays !== undefined && data.dueDate !== null && data.dueDate !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cannot set both Due Date and Custom Due Days. Please choose one.",
      path: ["customDueDays"],
    });
  }
});

type EditTaskFormValues = z.infer<typeof formSchema>;

const updateTask = async (values: EditTaskFormValues & { taskId: string }) => {
  const { taskId, ...updateData } = values;

  let finalDueDate = updateData.dueDate;
  if (updateData.customDueDays !== null && updateData.customDueDays !== undefined) {
    finalDueDate = addDays(new Date(), updateData.customDueDays);
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title: updateData.title,
      description: updateData.description,
      due_date: finalDueDate ? finalDueDate.toISOString() : null,
      custom_xp_award: updateData.customXpAward,
      custom_due_days: updateData.customDueDays,
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(`Failed to update task: ${error.message}`);
  }
};

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
}

export const EditTaskDialog = ({ open, onOpenChange, task }: EditTaskDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(formSchema),
  });

  React.useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        dueDate: task.due_date ? new Date(task.due_date) : null,
        customXpAward: task.custom_xp_award,
        customDueDays: task.custom_due_days,
      });
    }
  }, [task, form]);

  const mutation = useMutation({
    mutationFn: updateTask,
    onSuccess: () => {
      showSuccess("Task updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      queryClient.invalidateQueries({ queryKey: ["userTasks"] });
      onOpenChange(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: EditTaskFormValues) => {
    if (!task) return;
    mutation.mutate({ ...values, taskId: task.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>
            Make changes to the task details below.
          </DialogDescription>
        </DialogHeader>
        {task && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Complete project report" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Provide details about the task..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due Date (Optional)</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={form.watch("customDueDays") !== null && form.watch("customDueDays") !== undefined}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customDueDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Due Days (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 7 (days from now)"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                        value={field.value === null ? "" : field.value}
                        disabled={form.watch("dueDate") !== null}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="customXpAward"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom XP Award (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="e.g., 50"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                        value={field.value === null ? "" : field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};