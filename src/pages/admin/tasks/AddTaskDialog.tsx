"use client";

import * as React from "react";
import { useForm } from "react-hook-form"; // Removed useFieldArray
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";
import { User } from "@/types/user";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react"; // Removed Plus, XCircle
import { cn } from "@/lib/utils";
// Removed CustomAward import

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  assignedTo: z.string().uuid({ message: "Please select a user." }),
  dueDate: z.date().optional().nullable(),
}); // Removed customAwards

type AddTaskFormValues = z.infer<typeof formSchema>;

const fetchAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.functions.invoke("get-users");
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  return data.users || [];
};

const createTask = async (values: AddTaskFormValues, assignedBy: string) => {
  const { error } = await supabase.from("tasks").insert({
    title: values.title,
    description: values.description,
    assigned_to: values.assignedTo,
    assigned_by: assignedBy,
    status: 'pending',
    due_date: values.dueDate ? values.dueDate.toISOString() : null,
  }); // Removed custom_awards
  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
};

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddTaskDialog = ({ open, onOpenChange }: AddTaskDialogProps) => {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  // Removed showCustomAwardsSection state

  const form = useForm<AddTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      dueDate: null,
    }, // Removed customAwards
  });

  // Removed useFieldArray

  React.useEffect(() => {
    if (!open) {
      form.reset();
      // Removed setShowCustomAwardsSection(false);
    }
  }, [open, form]);

  const { data: users, isLoading: usersLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["allUsers"],
    queryFn: fetchAllUsers,
  });

  const mutation = useMutation({
    mutationFn: (values: AddTaskFormValues) => createTask(values, currentUser!.id),
    onSuccess: () => {
      showSuccess("Task created successfully.");
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      queryClient.invalidateQueries({ queryKey: ["userTasks"] });
      onOpenChange(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: AddTaskFormValues) => {
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
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Enter the details for the new task and assign it to a team member.
          </DialogDescription>
        </DialogHeader>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                {mutation.isPending ? "Creating..." : "Create Task"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};