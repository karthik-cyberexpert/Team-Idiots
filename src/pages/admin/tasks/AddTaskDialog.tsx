"use client";

import * as React from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import { format, addDays } from "date-fns";
import { CalendarIcon, Plus, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomAward } from "@/types/task";

const customAwardSchema = z.object({
  xp: z.coerce.number().int().min(0, { message: "XP must be a positive number." }),
  dueDays: z.coerce.number().int().min(0, { message: "Due days must be a positive number." }).nullable(),
});

const formSchema = z.object({
  title: z.string().min(1, { message: "Title is required." }),
  description: z.string().optional(),
  assignedTo: z.string().uuid({ message: "Please select a user." }),
  dueDate: z.date().optional().nullable(),
  customAwards: z.array(customAwardSchema).optional(),
}).superRefine((data, ctx) => {
  if (data.customAwards && data.customAwards.length > 0 && data.dueDate !== null && data.dueDate !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cannot set both a specific Due Date and Custom Awards. Please choose one.",
      path: ["dueDate"],
    });
  }
});

type AddTaskFormValues = z.infer<typeof formSchema>;

const fetchAllUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.functions.invoke("get-users");
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  return data.users || [];
};

const createTask = async (values: AddTaskFormValues, assignedBy: string) => {
  let finalDueDate = values.dueDate;
  if (!finalDueDate && values.customAwards && values.customAwards.length > 0) {
    // If custom awards are present, and no specific due date,
    // we might want to set a default due date or handle it differently.
    // For now, if custom awards are present, we assume due_date is handled by them or not needed.
    // If custom awards have due_days, the backend trigger will handle XP based on completion.
    // If no specific due date is set, and no custom due days are specified in custom awards,
    // the task will simply not have a due date.
  }

  const { error } = await supabase.from("tasks").insert({
    title: values.title,
    description: values.description,
    assigned_to: values.assignedTo,
    assigned_by: assignedBy,
    status: 'pending',
    due_date: finalDueDate ? finalDueDate.toISOString() : null,
    custom_awards: values.customAwards && values.customAwards.length > 0 ? values.customAwards : null,
  });
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
  const [showCustomAwardsSection, setShowCustomAwardsSection] = React.useState(false);

  const form = useForm<AddTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      dueDate: null,
      customAwards: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customAwards",
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
      setShowCustomAwardsSection(false);
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
                          disabled={showCustomAwardsSection}
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

            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCustomAwardsSection(!showCustomAwardsSection)}
                className="w-full"
                disabled={form.watch("dueDate") !== null}
              >
                {showCustomAwardsSection ? "Hide Custom XP Awards" : "Add Custom XP Awards"}
              </Button>

              {showCustomAwardsSection && (
                <div className="border p-4 rounded-md space-y-4">
                  <p className="text-sm text-muted-foreground">Define multiple XP awards and optional due days for this task.</p>
                  {fields.map((item, index) => (
                    <div key={item.id} className="flex items-end gap-2">
                      <FormField
                        control={form.control}
                        name={`customAwards.${index}.xp`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className={cn(index !== 0 && "sr-only")}>XP</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="XP"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                value={field.value === null ? "" : field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`customAwards.${index}.dueDays`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel className={cn(index !== 0 && "sr-only")}>Due Days</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Due Days (optional)"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                                value={field.value === null ? "" : field.value}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                        <XCircle className="h-5 w-5 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ xp: 0, dueDays: null })}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Award
                  </Button>
                </div>
              )}
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