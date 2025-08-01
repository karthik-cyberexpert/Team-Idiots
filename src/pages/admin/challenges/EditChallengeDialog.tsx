"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showSuccess, showError } from "@/utils/toast";
import { Challenge } from "@/types/challenge";
import { TypingText } from "@/types/typing-text";

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  xp_reward: z.coerce.number().int().min(0, "XP reward must be non-negative."),
  game_points_reward: z.coerce.number().int().min(0, "Game points reward must be non-negative."),
  type: z.enum(["one-time", "daily", "weekly"]),
  is_active: z.boolean(),
  challenge_type: z.enum(["manual", "task_completion", "typer_goal", "typer_multi_text_timed"]),
  related_task_id: z.string().uuid().nullable().optional(),
  typer_wpm_goal: z.coerce.number().int().min(1, "WPM goal must be at least 1.").optional().nullable(),
  typer_accuracy_goal: z.coerce.number().min(0).max(100, "Accuracy goal must be between 0 and 100.").optional().nullable(),
  typing_text_id: z.string().uuid().nullable().optional(),
  typing_text_ids_input: z.string().optional(), // For typer_multi_text_timed (comma-separated IDs)
  time_limit_seconds: z.coerce.number().int().min(1, "Time limit must be at least 1 second.").optional().nullable(),
});

type EditChallengeFormValues = z.infer<typeof formSchema>;

const fetchTypingTexts = async (): Promise<TypingText[]> => {
  const { data, error } = await supabase.from("typing_texts").select("id, title");
  if (error) throw new Error(error.message);
  return data;
};

const updateChallenge = async (values: any) => { // Use 'any' for now due to dynamic fields
  const { error } = await supabase.functions.invoke("update-challenge", { body: values });
  if (error) throw new Error(error.message);
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

  const { data: typingTexts, isLoading: typingTextsLoading } = useQuery<TypingText[]>({
    queryKey: ["typingTextsForChallenges"],
    queryFn: fetchTypingTexts,
    enabled: open, // Only fetch when dialog is open
  });

  React.useEffect(() => {
    if (challenge) {
      form.reset({
        title: challenge.title,
        description: challenge.description ?? "",
        xp_reward: challenge.xp_reward,
        game_points_reward: challenge.game_points_reward,
        type: challenge.type,
        is_active: challenge.is_active,
        challenge_type: challenge.challenge_type,
        related_task_id: challenge.related_task_id,
        typer_wpm_goal: challenge.typer_wpm_goal,
        typer_accuracy_goal: challenge.typer_accuracy_goal,
        typing_text_id: challenge.typing_text_id,
        typing_text_ids_input: challenge.typing_text_ids?.join(', ') || "", // Convert array to string for input
        time_limit_seconds: challenge.time_limit_seconds,
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
    const submissionValues: any = {
      ...challenge, // Keep existing challenge properties
      ...values, // Override with form values
      description: values.description || null,
    };

    // Clean up fields not relevant to the selected challenge_type
    if (submissionValues.challenge_type !== 'task_completion') {
      submissionValues.related_task_id = null;
    }
    if (submissionValues.challenge_type !== 'typer_goal') {
      submissionValues.typer_wpm_goal = null;
      submissionValues.typer_accuracy_goal = null;
      submissionValues.typing_text_id = null;
    }
    if (submissionValues.challenge_type !== 'typer_multi_text_timed') {
      submissionValues.typing_text_ids = null;
      submissionValues.time_limit_seconds = null;
    } else {
      // Parse comma-separated IDs for multi-text challenge
      submissionValues.typing_text_ids = submissionValues.typing_text_ids_input
        ? submissionValues.typing_text_ids_input.split(',').map((id: string) => id.trim()).filter(Boolean)
        : null;
    }
    delete submissionValues.typing_text_ids_input; // Remove the temporary input field

    mutation.mutate(submissionValues);
  };

  const selectedChallengeType = form.watch("challenge_type");

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
            <FormField control={form.control} name="xp_reward" render={({ field }) => (
              <FormItem><FormLabel>XP Reward</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="game_points_reward" render={({ field }) => (
              <FormItem><FormLabel>Game Points Reward</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem><FormLabel>Recurrence Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="one-time">One-Time</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Active</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
            )} />
            <FormField control={form.control} name="challenge_type" render={({ field }) => (
              <FormItem><FormLabel>Challenge Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="manual">Manual Completion</SelectItem><SelectItem value="task_completion">Task Completion</SelectItem><SelectItem value="typer_goal">Typer Goal (Single Text)</SelectItem><SelectItem value="typer_multi_text_timed">Typer Goal (Multi-Text Timed)</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />

            {selectedChallengeType === 'typer_goal' && (
              <>
                <FormField control={form.control} name="typing_text_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Typing Text</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a typing text" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typingTextsLoading ? (
                          <SelectItem value="loading" disabled>Loading texts...</SelectItem>
                        ) : (
                          typingTexts?.map((text) => (
                            <SelectItem key={text.id} value={text.id}>{text.title}</SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="typer_wpm_goal" render={({ field }) => (
                  <FormItem><FormLabel>WPM Goal</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="typer_accuracy_goal" render={({ field }) => (
                  <FormItem><FormLabel>Accuracy Goal (%)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </>
            )}

            {selectedChallengeType === 'typer_multi_text_timed' && (
              <>
                <FormField control={form.control} name="typing_text_ids_input" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Typing Text IDs (Comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., uuid1, uuid2, uuid3"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <DialogDescription>
                      Enter the UUIDs of the typing texts for this challenge, separated by commas.
                      You can find text IDs in Typer Management.
                    </DialogDescription>
                  </FormItem>
                )} />
                <FormField control={form.control} name="time_limit_seconds" render={({ field }) => (
                  <FormItem><FormLabel>Time Limit (Seconds)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </>
            )}

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