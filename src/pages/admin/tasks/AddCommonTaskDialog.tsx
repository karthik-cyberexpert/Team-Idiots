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
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  dueDate: z.date().optional().nullable(),
});

type AddCommonTaskFormValues = z.infer<typeof formSchema>;

const createCommonTask = async (values: AddCommonTaskFormValues, assignedBy: string) => {
  let dueDateISO: string | null = null;
  if (values.dueDate) {
    const date = new Date(values.dueDate);
    date.setHours(23, 59, 59, 999); // Set to end of day in local time
    dueDateISO = date.toISOString();
  }

  const { error } = await supabase.functions.invoke("create-common-task", {
    body: {
      title: values.title,
      description: values.description,
      dueDate: dueDateISO,
      assignedBy,
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
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  const form = useForm<AddCommonTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: null,
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
          <DialogTitle className="text-vibrant-orange dark:text-vibrant-green">Create Common Task</DialogTitle>
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
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
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
                        onSelect={(date) => {
                          field.onChange(date);
                          setIsDatePickerOpen(false);
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
                {mutation.isPending ? "Creating..." : "Create For All"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};