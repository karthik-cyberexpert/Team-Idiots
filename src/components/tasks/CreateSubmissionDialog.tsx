"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";
import { Submission, Task } from "@/types/task";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  taskId: z.string().uuid({ message: "Please select a task." }),
  content: z.string().optional(),
  file: z.instanceof(File).optional(),
}).refine(data => !!data.content || !!data.file, {
  message: "You must provide either text content or a file.",
  path: ["content"],
});

type FormValues = z.infer<typeof formSchema>;

const fetchSubmittableTasks = async (): Promise<Pick<Task, 'id' | 'title'>[]> => {
  const { data, error } = await supabase.functions.invoke("get-submittable-tasks-for-user");
  if (error) throw new Error(error.message);
  return data || [];
};

const createOrUpdateSubmission = async (values: { taskId: string; content?: string; fileUrl?: string }) => {
  const { error } = await supabase.functions.invoke("create-or-update-submission", { body: values });
  if (error) throw new Error(error.message);
};

interface CreateSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submissionToEdit?: Submission | null;
}

export const CreateSubmissionDialog = ({ open, onOpenChange, submissionToEdit }: CreateSubmissionDialogProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isUploading, setIsUploading] = React.useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["submittableTasks"],
    queryFn: fetchSubmittableTasks,
    enabled: open && !submissionToEdit,
  });

  React.useEffect(() => {
    if (open) {
      form.reset({
        taskId: submissionToEdit?.task_id || "",
        content: submissionToEdit?.content || "",
        file: undefined,
      });
    }
  }, [open, submissionToEdit, form]);

  const mutation = useMutation({
    mutationFn: createOrUpdateSubmission,
    onSuccess: () => {
      showSuccess(`Submission ${submissionToEdit ? 'updated' : 'created'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ["userSubmissions"] });
      queryClient.invalidateQueries({ queryKey: ["submittableTasks"] });
      onOpenChange(false);
    },
    onError: (err: Error) => showError(err.message),
    onSettled: () => setIsUploading(false),
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setIsUploading(true);
    let fileUrl: string | undefined = submissionToEdit?.file_url || undefined;

    try {
      if (values.file) {
        const file = values.file;
        const fileExt = file.name.split('.').pop();
        const filePath = `${user.id}/${values.taskId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("submissions")
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("submissions").getPublicUrl(filePath);
        fileUrl = data.publicUrl;
      }
      
      await mutation.mutateAsync({ taskId: values.taskId, content: values.content, fileUrl });

    } catch (error: any) {
      showError(error.message);
      setIsUploading(false);
    }
  };

  const isSubmitting = isUploading || mutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{submissionToEdit ? "Edit Submission" : "Create New Submission"}</DialogTitle>
          <DialogDescription>Fill out the details for your task submission.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="taskId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={!!submissionToEdit}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a task to submit for..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {submissionToEdit ? (
                        <SelectItem value={submissionToEdit.task_id}>{submissionToEdit.tasks.title}</SelectItem>
                      ) : tasksLoading ? (
                        <SelectItem value="loading" disabled>Loading tasks...</SelectItem>
                      ) : (
                        tasks?.map(task => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Type your submission content here..." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, value, ...rest } }) => (
                <FormItem>
                  <FormLabel>File (Optional)</FormLabel>
                  <FormControl><Input type="file" onChange={e => onChange(e.target.files?.[0])} {...rest} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? "Submitting..." : (submissionToEdit ? "Update Submission" : "Create Submission")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};