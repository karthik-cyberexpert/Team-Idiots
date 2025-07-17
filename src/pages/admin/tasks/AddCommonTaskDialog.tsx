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
import { useAuth } from "@/contexts/AuthProvider";

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

type AddCommonTaskFormValues = z.infer<typeof formSchema>;

const createCommonTask = async (values: AddCommonTaskFormValues, assignedBy: string) => {
  let finalDueDate = values.dueDate;
  if (values.customDueDays !== null && values.customDueDays !== undefined) {
    finalDueDate = addDays(new Date(), values.customDueDays);
  }

  const { error } = await supabase.functions.invoke("create-common-task", {
    body: {
      title: values.title,
      description: values.description,
      dueDate: finalDueDate ? finalDueDate.toISOString() : null,
      assignedBy,
      customXpAward: values.customXpAward,
      customDueDays: values.customDueDays,
    },
  });
  if (error) {
    throw new Error(`Failed to create common task: ${error.message}`);
  }
};

interface AddCommonTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCommonTaskDialog = ({ open, onOpenChange }: AddCommonTaskDialogProps) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  const form = useForm<AddCommonTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: null,
      customXpAward: null,
      customDueDays: null,
    },
  });

  const mutation = useMutation({
    mutationFn: (values: AddCommonTaskFormValues) => createCommonTask(values, currentUser!.id),
    onSuccess: () => {
      showSuccess("Common task created and assigned to all users.");
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      queryClient.invalidateQueries({ queryKey: ["userTasks"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: AddCommonTaskFormValues) => {
    if (!currentUser) {
      showError("You must be logged in to create tasks.");
      return;
    }
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Common Task</DialogTitle>
          <DialogDescription>
            This task will be assigned to every user in the system.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Complete weekly timesheet" {...field} />
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
                {mutation.isPending ? "Creating..." : "Create For All"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};