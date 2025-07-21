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

const updateTaskStatusByAdmin = async ({ taskId, status }: { taskId: string; status: 'completed' | 'rejected' }) => {
  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
};

const TaskManagement = () => {
  const queryClient = useQueryClient();
  const [taskToDelete, setTaskToDelete] = React.useState<string | null>(null);
  const [taskToEdit, setTaskToEdit] = React.useState<Task | null>(null);
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

  const updateStatusMutation = useMutation({
    mutationFn: updateTaskStatusByAdmin,
    onSuccess: (_, variables) => {
      showSuccess(`Task has been ${variables.status}.`);
      queryClient.invalidateQueries({ queryKey: ["adminTasks", "userTasks"] });
      queryClient.invalidateQueries({ queryKey: ["xpHistory"] }); // Invalidate XP history
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] }); // Invalidate leaderboard
      queryClient.invalidateQueries({ queryKey: ["users"] }); // Invalidate users to update XP in admin table
      setApprovalAction(null);
    },
    onError: (err) => {
      showError(err.message);
      setApprovalAction(null);
    },
  });

  const handleDeleteRequest = React.useCallback((taskId: string) => setTaskToDelete(taskId), []);
  const handleEditRequest = React.useCallback((task: Task) => setTaskToEdit(task), []);
  const handleApproveRequest = React.useCallback((taskId: string) => setApprovalAction({ type: 'approve', taskId }), []);
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
            <Button disabled>Add Common Task</Button>
            <Button disabled>Add Task</Button>
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
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">Task Management</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsAddCommonTaskDialogOpen(true)}>Add Common Task</Button>
            <Button onClick={() => setIsAddTaskDialogOpen(true)}>Add Task</Button>
          </div>
        </div>
        <DataTable columns={columns} data={tasks || []} />
      </div>

      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
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

      <AlertDialog open={!!approvalAction} onOpenChange={() => setApprovalAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {approvalAction?.type} this task submission?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approvalAction && updateStatusMutation.mutate({ taskId: approvalAction.taskId, status: approvalAction.type === 'approve' ? 'completed' : 'rejected' })}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskManagement;