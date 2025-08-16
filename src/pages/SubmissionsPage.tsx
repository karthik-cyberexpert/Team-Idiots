"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Submission } from "@/types/task";
import { PlusCircle, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { SubmissionCard } from "@/components/tasks/SubmissionCard";
import { CreateSubmissionDialog } from "@/components/tasks/CreateSubmissionDialog";
import { ViewSubmissionDialog } from "@/components/tasks/ViewSubmissionDialog";

const fetchUserSubmissions = async (): Promise<Submission[]> => {
  const { data, error } = await supabase.functions.invoke("get-user-submissions");
  if (error) throw new Error(error.message);
  return data || [];
};

const TasksPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = React.useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [submissionToEdit, setSubmissionToEdit] = React.useState<Submission | null>(null);
  const [submissionToView, setSubmissionToView] = React.useState<string | null>(null);
  const SUBMISSIONS_PER_PAGE = 6;

  const { data: submissions, isLoading, error } = useQuery<Submission[]>({
    queryKey: ["userSubmissions", user?.id],
    queryFn: fetchUserSubmissions,
    enabled: !!user && !authLoading,
  });

  React.useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`user-submissions-realtime-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_submissions', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['userSubmissions', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const paginatedSubmissions = React.useMemo(() => {
    if (!submissions) return [];
    const startIndex = currentPage * SUBMISSIONS_PER_PAGE;
    return submissions.slice(startIndex, startIndex + SUBMISSIONS_PER_PAGE);
  }, [submissions, currentPage]);

  const totalPages = submissions ? Math.ceil(submissions.length / SUBMISSIONS_PER_PAGE) : 0;

  const handleEdit = (submission: Submission) => {
    setSubmissionToEdit(submission);
    setIsCreateDialogOpen(true);
  };

  const handleCreate = () => {
    setSubmissionToEdit(null);
    setIsCreateDialogOpen(true);
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-vibrant-red">Error loading submissions: {error.message}</div>;
  }

  return (
    <>
      <CreateSubmissionDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        submissionToEdit={submissionToEdit}
      />
      <ViewSubmissionDialog
        open={!!submissionToView}
        onOpenChange={() => setSubmissionToView(null)}
        taskId={submissionToView}
      />
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">My Submissions</h1>
          <Button onClick={handleCreate}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Submission
          </Button>
        </div>
        {submissions && submissions.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedSubmissions.map((submission) => (
                <SubmissionCard
                  key={submission.id}
                  submission={submission}
                  onView={setSubmissionToView}
                  onEdit={handleEdit}
                />
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-4 pt-4">
                <Button variant="outline" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 0}>
                  <ChevronLeft className="h-4 w-4 mr-2" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentPage + 1} of {totalPages}</span>
                <Button variant="outline" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages - 1}>
                  Next <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-10 border-2 border-dashed rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">You haven't made any submissions yet.</p>
            <Button onClick={handleCreate} className="mt-4">Make Your First Submission</Button>
          </div>
        )}
      </div>
    </>
  );
};

export default TasksPage;