"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { Challenge } from "@/types/challenge";
import { TypingText } from "@/types/typing-text"; // Import TypingText type

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  xp_reward: z.coerce.number().int().min(0, "XP reward must be non-negative."),
  game_points_reward: z.coerce.number().int().min(0, "Game Points reward must be non-negative."),
  type: z.enum(["one-time", "daily", "weekly"]),
  is_active: z.boolean(),
  challenge_type: z.enum(["manual", "task_completion", "typer_goal"]),
  related_task_id: z.string().uuid().optional().nullable(),
  typer_wpm_goal: z.coerce.number().int().min(0).optional().nullable(),
  typer_accuracy_goal: z.coerce.number().int().min(0).max(100).optional().nullable(),
  typing_text_id: z.string().uuid().optional().nullable(), // New field for linking typing text
  time_limit_seconds: z.coerce.number().int().min(1).optional().nullable(), // New field for time limit
}).refine(data => {
    if (data.challenge_type === 'task_completion') return !!data.related_task_id;
    return true;
}, { message: "A task must be selected.", path: ["related_task_id"] })
.refine(data => {
    if (data.challenge_type === 'typer_goal') {
      return data.typer_wpm_goal != null && data.typer_accuracy_goal != null && data.typing_text_id != null;
    }
    return true;
}, { message: "WPM goal, Accuracy goal, and Typing Text are required for Typer challenges.", path: ["typer_wpm_goal", "typer_accuracy_goal", "typing_text_id"] });

type EditChallengeFormValues = z.infer<typeof formSchema>;

const updateChallenge = async (values: EditChallengeFormValues & { id: string }) => {
  const { error } = await supabase.functions.invoke("update-challenge", { body: values });
  if (error) throw new Error(error.message);
};

const fetchTasksForLinking = async (): Promise<{ id: string; title: string }[]> => {
  const { data, error } = await supabase.functions.invoke("get-tasks-for-linking");
  if (error) throw new Error(error.message);
  return data.data || [];
};

const fetchAllTypingTextsForSelection = async (): Promise<TypingText[]> => {
  const { data, error } = await supabase.functions.invoke("get-typing-texts");
  if (error) throw new Error(error.message);
  return data.data || [];
};

interface EditChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challenge: Challenge | null;
}

export const EditChallengeDialog = ({ open, onOpenChange, challenge }: EditChallengeDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<EditChallengeFormValues>({
    resolver: zodResolver(formSchema),
  });

  const challengeType = form.watch("challenge_type");

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["tasksForLinking"],
    queryFn: fetchTasksForLinking,
    enabled: challengeType === 'task_completion',
  });

  const { data: typingTexts, isLoading: typingTextsLoading } = useQuery<TypingText[]>({
    queryKey: ["typingTextsForChallengesSelection"], // New query key for selection
    queryFn: fetchAllTypingTextsForSelection, // Fetch all texts for selection
    enabled: challengeType === 'typer_goal',
  });

  React.useEffect(() => {
    if (challenge) {
      form.reset({
        ...challenge,
        description: challenge.description ?? "",
        related_task_id: challenge.related_task_id ?? undefined,
        typer_wpm_goal: challenge.typer_wpm_goal ?? undefined,
        typer_accuracy_goal: challenge.typer_accuracy_goal ?? undefined,
        typing_text_id: challenge.typing_text_id ?? undefined,
        time_limit_seconds: challenge.time_limit_seconds ?? undefined,
      });
    }
  }, [challenge, form]);

  const mutation = useMutation({
    mutationFn: updateChallenge,
    onSuccess: () => {
      showSuccess("Challenge updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      onOpenChange(false);
    },
    onError: (err) => showError(err.message),
  });

  const onSubmit = (values: EditChallengeFormValues) => {
    if (!challenge) return;
    // Ensure null for optional fields if they are empty strings or undefined
    const submissionValues = {
      ...values,
      description: values.description || null,
      related_task_id: values.related_task_id || null,
      typer_wpm_goal: values.typer_wpm_goal || null,
      typer_accuracy_goal: values.typer_accuracy_goal || null,
      typing_text_id: values.typing_text_id || null,
      time_limit_seconds: values.time_limit_seconds || null,
    };
    mutation.mutate({ ...submissionValues, id: challenge.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Challenge</DialogTitle>
          <DialogDescription>Make changes to the challenge details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex gap-4">
              <FormField control={form.control} name="xp_reward" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>XP Reward</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="game_points_reward" render={({ field }) => (
                <FormItem className="flex-1"><FormLabel>Game Points Reward</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="challenge_type" render={({ field }) => (
              <FormItem><FormLabel>Completion Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="manual">Manual</SelectItem><SelectItem value="task_completion">Task Completion</SelectItem><SelectItem value="typer_goal">Typer Goal</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            
            {challengeType === 'task_completion' && (
              <FormField control={form.control} name="related_task_id" render={({ field }) => (
                <FormItem><FormLabel>Task to Complete</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger>{tasksLoading ? "Loading tasks..." : <SelectValue />}</SelectTrigger></FormControl><SelectContent>{tasks?.map(task => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
            )}

            {challengeType === 'typer_goal' && (
              <>
                <FormField control={form.control} name="typing_text_id" render={({ field }) => (
                  <FormItem><FormLabel>Typing Text</FormLabel><Select onValueChange={field.onChange} value={field.value ?? undefined}><FormControl><SelectTrigger>{typingTextsLoading ? "Loading texts..." : <SelectValue />}</SelectTrigger></FormControl><SelectContent>{typingTexts?.map(text => <SelectItem key={text.id} value={text.id}>{text.title}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <div className="flex gap-4">
                  <FormField control={form.control} name="typer_wpm_goal" render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>WPM Goal</FormLabel><FormControl><Input type="number" placeholder="e.g., 80" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="typer_accuracy_goal" render={({ field }) => (
                    <FormItem className="flex-1"><FormLabel>Accuracy Goal (%)</FormLabel><FormControl><Input type="number" placeholder="e.g., 95" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="time_limit_seconds" render={({ field }) => (
                  <FormItem><FormLabel>Time Limit (seconds, optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 60" {...field} onChange={e => field.onChange(parseInt(e.target.value, 10))} /></FormControl><FormMessage /></FormItem>
                )} />
              </>
            )}

            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem><FormLabel>Recurrence Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="one-time">One-Time</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Active</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};