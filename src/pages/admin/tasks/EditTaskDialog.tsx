"use client";

import * as React from "react";
import { useForm } from "react-hook-form"; // Removed useFieldArray
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
import { CalendarIcon } from "lucide-react"; // Removed Plus, XCircle
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { Task } from "@/types/task"; // Removed CustomAward import
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types/user";

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  assignedTo: z.string().uuid({ message: "Please select a user." }),
  dueDate: z.date().optional().nullable(),
}); // Removed customAwards

type EditTaskFormValues = z.infer<typeof formSchema>;

const fetchAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.functions.invoke("get-users");
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  return data.users || [];
};

const updateTask = async (values: EditTaskFormValues & { taskId: string }) => {
  const { taskId, ...updateData } = values;

  const { error } = await supabase
    .from("tasks")
    .update({
      title: updateData.title,
      description: updateData.description,
      assigned_to: updateData.assignedTo,
      due_date: updateData.dueDate ? updateData.dueDate.toISOString() : null,
      custom_awards: null, // Explicitly set to null to remove any existing custom awards
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
  // Removed showCustomAwardsSection state

  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(formSchema),
  });

  // Removed useFieldArray

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: fetchAllUsers,
  });

  React.useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || "",
        assignedTo: task.assigned_to,
        dueDate: task.due_date ? new Date(task.due_date) : null,
      }); // Removed customAwards
      // Removed setShowCustomAwardsSection logic
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
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto px-1">
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
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {usersLoading && <SelectItem value="loading-users" disabled>Loading users...</SelectItem>}
                          {usersError && <SelectItem value="error-loading-users" disabled>Error loading users</SelectItem>}
                          {users && users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                              // Removed disabled={showCustomAwardsSection}
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

                {/* Removed Custom Awards Section */}
              </div>
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