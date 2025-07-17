"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getColumns } from "./tasks/columns";
import { DataTable } from "@/components/ui/data-table";
import { Task } from "@/types/task";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { AddTaskDialog } from "./tasks/AddTaskDialog";
// import { EditTaskDialog } from "./tasks/EditTaskDialog"; // Will be added later

const fetchAllTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      profiles!tasks_assigned_to_fkey(full_name),
      assigner_profile:profiles!tasks_assigned_by_fkey(full_name)
    `)
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }
  return data as Task[];
};

const deleteTask = async (taskId: string) => {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }
};

const TaskManagement = () => {
  const queryClient = useQueryClient();
  const [taskToDelete, setTaskToDelete] = React.useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = React.useState<Task | null>(null); // For future edit functionality
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = React.useState(false);

  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ["adminTasks"],
    queryFn: fetchAllTasks,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      showSuccess("Task deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      queryClient.invalidateQueries({ queryKey: ["userTasks"] }); // Invalidate user tasks too
      setTaskToDelete(null);
    },
    onError: (err) => {
      showError(err.message);
      setTaskToDelete(null);
    },
  });

  const handleDeleteRequest = React.useCallback((taskId: string) => {
    setTaskToDelete(taskId);
  }, []);

  const handleEditRequest = React.useCallback((task: Task) => {
    setTaskToEdit(task);
    // setIsEditTaskDialogOpen(true); // For future edit functionality
  }, []);

  const columns = React.useMemo(() => getColumns(handleDeleteRequest, handleEditRequest), [handleDeleteRequest, handleEditRequest]);

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Task Management</h1>
          <Button disabled>Add Task</Button>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <AddTaskDialog open={isAddTaskDialogOpen} onOpenChange={setIsAddTaskDialogOpen} />
      {/* <EditTaskDialog open={!!taskToEdit} onOpenChange={() => setTaskToEdit(null)} task={taskToEdit} /> */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Task Management</h1>
          <Button onClick={() => setIsAddTaskDialogOpen(true)}>Add Task</Button>
        </div>
        <DataTable columns={columns} data={tasks || []} />
      </div>

      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => taskToDelete && deleteMutation.mutate(taskToDelete)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskManagement;