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
import { format, setHours, setMinutes } from "date-fns"; // Import setHours and setMinutes
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { Task } from "@/types/task";
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
  dueTime: z.string().optional(), // New field for time
});

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

  let combinedDueDate = null;
  if (updateData.dueDate) {
    combinedDueDate = updateData.dueDate;
    if (updateData.dueTime) {
      const [hours, minutes] = updateData.dueTime.split(':').map(Number);
      combinedDueDate = setHours(combinedDueDate, hours);
      combinedDueDate = setMinutes(combinedDueDate, minutes);
    } else {
      // If no time is specified, default to end of day for consistency
      combinedDueDate = setHours(combinedDueDate, 23);
      combinedDueDate = setMinutes(combinedDueDate, 59);
    }
  }

  const { error } = await supabase
    .from("tasks")
    .update({
      title: updateData.title,
      description: updateData.description,
      assigned_to: updateData.assignedTo,
      due_date: combinedDueDate ? combinedDueDate.toISOString() : null,
      custom_awards: null,
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

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: fetchAllUsers,
  });

  React.useEffect(() => {
    if (task) {
      const dueDate = task.due_date ? new Date(task.due_date) : null;
      const dueTime = dueDate ? format(dueDate, "HH:mm") : "";
      form.reset({
        title: task.title,
        description: task.description || "",
        assignedTo: task.assigned_to,
        dueDate: dueDate,
        dueTime: dueTime,
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-vibrant-blue dark:text-vibrant-pink">Edit Task</DialogTitle>
          <DialogDescription>
            Make changes to the task details below.
          </DialogDescription>
        </DialogHeader>
        {task && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="grid gap-4 py-4 px-1 space-y-4">
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
                              {user.full_name} (<span className="text-vibrant-green">{user.email}</span>)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col flex-1">
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
                    name="dueTime"
                    render={({ field }) => (
                      <FormItem className="flex flex-col w-1/3">
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Cancel</Button>
                <Button type="submit" disabled={mutation.isPending} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
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