"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, CircleDashed, CalendarDays, Send, ShieldQuestion, RefreshCw } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Task } from "@/types/task";
import { Badge } from "@/components/ui/badge";

const fetchUserTasks = async (userId: string): Promise<Task[]> => {
  const { data, error } = await supabase
    .from("tasks")
    .select(`
      *,
      profiles!tasks_assigned_to_profile_fkey(full_name),
      assigner_profile:profiles!tasks_assigned_by_profile_fkey(full_name)
    `)
    .eq("assigned_to", userId)
    .order("due_date", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);
  return data as Task[];
};

const updateTaskStatus = async (taskId: string, status: 'waiting_for_approval' | 'pending') => {
  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
};

const TasksPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading, error } = useQuery<Task[]>({
    queryKey: ["userTasks", user?.id],
    queryFn: () => fetchUserTasks(user!.id),
    enabled: !!user && !authLoading,
  });

  // Real-time subscription for user's tasks
  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`user-tasks-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `assigned_to=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['userTasks', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: 'waiting_for_approval' | 'pending' }) =>
      updateTaskStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      // Cancel any outgoing refetches for the tasks query
      await queryClient.cancelQueries({ queryKey: ["userTasks", user?.id] });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<Task[]>(["userTasks", user?.id]);

      // Optimistically update to the new value
      queryClient.setQueryData<Task[]>(["userTasks", user?.id], (old) =>
        old?.map((task) =>
          task.id === taskId ? { ...task, status: status, updated_at: new Date().toISOString() } : task
        )
      );

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      showError(err.message);
      // Rollback to the previous value on error
      queryClient.setQueryData(["userTasks", user?.id], context?.previousTasks);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data is in sync
      queryClient.invalidateQueries({ queryKey: ["userTasks", user?.id] });
    },
    onSuccess: (data, variables) => {
      const message = variables.status === 'waiting_for_approval' 
        ? "Task submitted for approval!"
        : "Task status updated.";
      showSuccess(message);
    },
  });

  const getStatusBadge = (status: Task['status']) => {
    const statusText = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    switch (status) {
      case 'completed':
        return <Badge variant="default">{statusText}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{statusText}</Badge>;
      case 'waiting_for_approval':
        return <Badge variant="outline">{statusText}</Badge>;
      case 'rejected':
        return <Badge variant="destructive">{statusText}</Badge>;
      default:
        return <Badge>{statusText}</Badge>;
    }
  };

  const getTaskAction = (task: Task) => {
    switch (task.status) {
      case 'pending':
        return (
          <Button
            size="sm"
            onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'waiting_for_approval' })}
            disabled={updateStatusMutation.isPending}
          >
            <Send className="h-4 w-4 mr-2" /> Submit for Approval
          </Button>
        );
      case 'waiting_for_approval':
        return (
          <Button size="sm" disabled>
            <ShieldQuestion className="h-4 w-4 mr-2" /> Pending Approval
          </Button>
        );
      case 'rejected':
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'waiting_for_approval' })}
            disabled={updateStatusMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Resubmit
          </Button>
        );
      case 'completed':
        return (
          <div className="flex items-center text-green-600 font-semibold">
            <CheckCircle className="h-4 w-4 mr-2" /> Completed
          </div>
        );
      default:
        return null;
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Your Tasks</h1>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error loading tasks: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Your Tasks</h1>
      {tasks && tasks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tasks.map((task) => (
            <Card key={task.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Assigned by: {task.assigner_profile?.full_name || "N/A"}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <p className="text-sm text-foreground">{task.description || "No description provided."}</p>

                <div className="flex items-center text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "No due date"}
                </div>
                {getStatusBadge(task.status)}
              </CardContent>
              <div className="p-4 border-t flex justify-end">
                {getTaskAction(task)}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">No tasks assigned to you yet!</p>
        </div>
      )}
    </div>
  );
};

export default TasksPage;