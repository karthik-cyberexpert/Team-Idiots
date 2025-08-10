"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ListTodo, CheckCircle, Clock, AlertCircle, XCircle, Hourglass, ThumbsUp, Type } from "lucide-react";
import { Task } from "@/types/task";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format, isPast } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface TaskWithSubmission extends Task {
  task_submissions: { id: string }[];
}

const fetchUserTasks = async (): Promise<TaskWithSubmission[]> => {
  const { data, error } = await supabase.functions.invoke("get-user-tasks");
  if (error) throw new Error(error.message);
  return data || [];
};

const getStatusInfo = (task: TaskWithSubmission) => {
  const status = task.status;
  const dueDate = task.due_date ? new Date(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && status === 'pending';

  if (isOverdue) {
    return { icon: <AlertCircle className="h-5 w-5 text-vibrant-red" />, text: "Overdue", color: "text-vibrant-red" };
  }

  switch (status) {
    case 'pending': return { icon: <Hourglass className="h-5 w-5 text-vibrant-orange" />, text: "Pending", color: "text-vibrant-orange" };
    case 'waiting_for_approval': return { icon: <ThumbsUp className="h-5 w-5 text-vibrant-blue" />, text: "Waiting for Approval", color: "text-vibrant-blue" };
    case 'completed': return { icon: <CheckCircle className="h-5 w-5 text-vibrant-green" />, text: "Completed", color: "text-vibrant-green" };
    case 'late_completed': return { icon: <CheckCircle className="h-5 w-5 text-vibrant-brown" />, text: "Completed (Late)", color: "text-vibrant-brown" };
    case 'rejected': return { icon: <XCircle className="h-5 w-5 text-vibrant-red" />, text: "Rejected", color: "text-vibrant-red" };
    default: return { icon: <Clock className="h-5 w-5 text-muted-foreground" />, text: status, color: "text-muted-foreground" };
  }
};

const TasksPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const { data: tasks, isLoading, error } = useQuery<TaskWithSubmission[]>({
    queryKey: ["userTasks", user?.id],
    queryFn: fetchUserTasks,
    enabled: !!user && !authLoading,
  });

  const sortedTasks = React.useMemo(() => {
    if (!tasks) return [];
    const statusOrder: Record<Task['status'], number> = { 'pending': 1, 'rejected': 2, 'waiting_for_approval': 3, 'completed': 4, 'late_completed': 5, 'failed': 6 };
    return [...tasks].sort((a, b) => {
      const aIsOverdue = a.due_date && isPast(new Date(a.due_date)) && a.status === 'pending';
      const bIsOverdue = b.due_date && isPast(new Date(b.due_date)) && b.status === 'pending';
      if (aIsOverdue && !bIsOverdue) return -1;
      if (!aIsOverdue && bIsOverdue) return 1;
      return (statusOrder[a.status] || 99) - (statusOrder[b.status] || 99);
    });
  }, [tasks]);

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-vibrant-red">Error loading tasks: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold">My Tasks</h1>
        <Button onClick={() => navigate('/dashboard/submissions')}>
          View My Submissions
        </Button>
      </div>
      {sortedTasks && sortedTasks.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedTasks.map(task => {
            const statusInfo = getStatusInfo(task);
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const isOverdue = dueDate && isPast(dueDate) && task.status === 'pending';
            const hasSubmission = task.task_submissions && task.task_submissions.length > 0;
            const canSubmit = (task.status === 'pending' || task.status === 'rejected') && !hasSubmission && !isOverdue;
            const isTyperTask = task.task_type === 'typer';

            return (
              <Card key={task.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="text-lg">{task.title}</CardTitle>
                  <CardDescription>Assigned by: {task.assigner_profile?.full_name || 'Admin'}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <div className="flex items-center gap-2">
                    {statusInfo.icon}
                    <span className={statusInfo.color}>{statusInfo.text}</span>
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>Due: {format(new Date(task.due_date), "PPP p")}</span>
                    </div>
                  )}
                  {isTyperTask && <Badge variant="outline"><Type className="mr-1 h-3 w-3" />Typer Challenge</Badge>}
                </CardContent>
                <CardFooter>
                  {isTyperTask ? (
                    <Button className="w-full" onClick={() => navigate(`/dashboard/typer?taskId=${task.id}&textId=${task.related_typing_text_id}`)} disabled={task.status !== 'pending' || isOverdue}>
                      Start Challenge
                    </Button>
                  ) : canSubmit ? (
                    <Button className="w-full" onClick={() => navigate('/dashboard/submissions')}>
                      Submit Work
                    </Button>
                  ) : (
                    <Button className="w-full" variant="outline" disabled>
                      {isOverdue ? "Overdue" : hasSubmission ? "Submitted" : "Completed"}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-10 border-2 border-dashed rounded-lg">
          <ListTodo className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">You have no assigned tasks. Great job!</p>
        </div>
      )}
    </div>
  );
};

export default TasksPage;