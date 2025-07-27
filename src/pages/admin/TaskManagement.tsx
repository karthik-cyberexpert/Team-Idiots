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
import { EditTaskDialog } from "./tasks/EditTaskDialog";
import { AddCommonTaskDialog } from "./tasks/AddCommonTaskDialog";
import { AwardMarksAndXpDialog } from "./tasks/AwardMarksAndXpDialog"; // Import the new dialog

const fetchAllTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      profiles!tasks_assigned_to_profile_fkey(full_name),
      assigner_profile:profiles!tasks_assigned_by_profile_fkey(full_name)
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

// Removed updateTaskStatusByAdmin as its functionality is now in update-task-completion-details edge function

const TaskManagement = () => {
  const queryClient = useQueryClient();
  const [taskToDelete, setTaskToDelete] = React.useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = React.useState<Task | null>(null);
  const [taskToAward, setTaskToAward] = React.useState<Task | null>(null); // New state for task to award marks/XP
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = React.useState(false);
  const [isAddCommonTaskDialogOpen, setIsAddCommonTaskDialogOpen] = React.useState(false);
  const [approvalAction, setApprovalAction] = React.useState<{ type: 'approve' | 'reject'; taskId: string } | null>(null);

  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ["adminTasks"],
    queryFn: fetchAllTasks,
  });

  // Real-time subscription for task changes
  React.useEffect(() => {
    const channel = supabase
      .channel('admin-tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['adminTasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      showSuccess("Task deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["adminTasks", "userTasks"] });
      setTaskToDelete(null);
    },
    onError: (err) => {
      showError(err.message);
      setTaskToDelete(null);
    },
  });

  // New mutation for rejecting tasks (since approval now uses a dialog)
  const rejectTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq("id", taskId);
      if (error) throw new Error(error.message);
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["adminTasks"] });
      await queryClient.cancelQueries({ queryKey: ["userTasks"] });
      const previousAdminTasks = queryClient.getQueryData<Task[]>(["adminTasks"]);
      const previousUserTasks = queryClient.getQueryData<Task[]>(["userTasks"]);

      queryClient.setQueryData<Task[]>(["adminTasks"], (old) =>
        old?.map((task) =>
          task.id === taskId ? { ...task, status: 'rejected', updated_at: new Date().toISOString() } : task
        )
      );
      queryClient.setQueryData<Task[]>(["userTasks"], (old) =>
        old?.map((task) =>
          task.id === taskId ? { ...task, status: 'rejected', updated_at: new Date().toISOString() } : task
        )
      );
      return { previousAdminTasks, previousUserTasks };
    },
    onSuccess: () => {
      showSuccess("Task has been rejected.");
      setApprovalAction(null);
    },
    onError: (err, variables, context) => {
      showError(err.message);
      queryClient.setQueryData(["adminTasks"], context?.previousAdminTasks);
      queryClient.setQueryData(["userTasks"], context?.previousUserTasks);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["adminTasks"] });
      queryClient.invalidateQueries({ queryKey: ["userTasks"] });
    },
  });


  const handleDeleteRequest = React.useCallback((taskId: string) => setTaskToDelete(taskId), []);
  const handleEditRequest = React.useCallback((task: Task) => setTaskToEdit(task), []);
  
  // Modified handleApproveRequest to open the new dialog
  const handleApproveRequest = React.useCallback((task: Task) => {
    setTaskToAward(task); // Set the task to be awarded
  }, []);

  const handleRejectRequest = React.useCallback((taskId: string) => setApprovalAction({ type: 'reject', taskId }), []);

  const columns = React.useMemo(
    () => getColumns(handleDeleteRequest, handleEditRequest, handleApproveRequest, handleRejectRequest),
    [handleDeleteRequest, handleEditRequest, handleApproveRequest, handleRejectRequest]
  );

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Task Management</h1>
          <div className="flex gap-2">
            <Button disabled className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Add Common Task</Button>
            <Button disabled className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Add Task</Button>
          </div>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
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
      <AddCommonTaskDialog open={isAddCommonTaskDialogOpen} onOpenChange={setIsAddCommonTaskDialogOpen} />
      <EditTaskDialog open={!!taskToEdit} onOpenChange={() => setTaskToEdit(null)} task={taskToEdit} />
      <AwardMarksAndXpDialog open={!!taskToAward} onOpenChange={() => setTaskToAward(null)} task={taskToAward} /> {/* New dialog */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Task Management</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddCommonTaskDialogOpen(true)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Add Common Task</Button>
            <Button onClick={() => setIsAddTaskDialogOpen(true)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Add Task</Button>
          </div>
        </div>
        <DataTable columns={columns} data={tasks || []} />
      </div>

      <AlertDialog open={!!taskToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. This will permanently delete the task.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => taskToDelete && deleteMutation.mutate(taskToDelete)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* This AlertDialog is now only for 'reject' action */}
      <AlertDialog open={approvalAction?.type === 'reject'} onOpenChange={() => setApprovalAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this task submission?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approvalAction && rejectTaskMutation.mutate(approvalAction.taskId)}
              disabled={rejectTaskMutation.isPending}
            >
              {rejectTaskMutation.isPending ? "Processing..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskManagement;