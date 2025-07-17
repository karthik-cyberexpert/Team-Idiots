"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, CircleDashed, CalendarDays } from "lucide-react";
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

const updateTaskStatus = async (taskId: string, status: 'pending' | 'completed') => {
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

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: 'pending' | 'completed' }) =>
      updateTaskStatus(taskId, status),
    onSuccess: () => {
      showSuccess("Task status updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["userTasks", user?.id] });
    },
    onError: (err) => {
      showError(err.message);
    },
  });

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
                <Badge variant={task.status === 'completed' ? 'default' : 'secondary'}>
                  {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                </Badge>
              </CardContent>
              <div className="p-4 border-t flex justify-end">
                {task.status === 'pending' ? (
                  <Button
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'completed' })}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" /> Mark as Complete
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ taskId: task.id, status: 'pending' })}
                    disabled={updateStatusMutation.isPending}
                  >
                    <CircleDashed className="h-4 w-4 mr-2" /> Mark as Pending
                  </Button>
                )}
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