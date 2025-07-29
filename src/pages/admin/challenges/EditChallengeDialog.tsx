"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  xp_reward: z.coerce.number().int().min(0, "XP reward must be non-negative."),
  game_points_reward: z.coerce.number().int().min(0, "Game points reward must be non-negative."),
  type: z.enum(["one-time", "daily", "weekly"]),
  is_active: z.boolean(),
  challenge_type: z.enum(["manual", "task_completion", "typer_goal"]), // Removed 'typer_multi_text_timed'
  related_task_id: z.string().uuid().nullable().optional(),
  typer_wpm_goal: z.coerce.number().int().min(1, "WPM goal must be at least 1.").optional().nullable(),
  typer_accuracy_goal: z.coerce.number().min(0).max(100, "Accuracy goal must be between 0 and 100.").optional().nullable(),
  typing_text_id: z.string().uuid().nullable().optional(),
});

type EditChallengeFormValues = z.infer<typeof formSchema>;

const updateChallenge = async (values: Challenge) => {
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

  React.useEffect(() => {
    if (challenge) {
      form.reset({
        title: challenge.title,
        description: challenge.description ?? "",
        xp_reward: challenge.xp_reward,
        game_points_reward: challenge.game_points_reward,
        type: challenge.type,
        is_active: challenge.is_active,
        challenge_type: challenge.challenge_type === 'typer_multi_text_timed' ? 'manual' : challenge.challenge_type, // Default to manual if it was multi-text
        related_task_id: challenge.related_task_id,
        typer_wpm_goal: challenge.typer_wpm_goal,
        typer_accuracy_goal: challenge.typer_accuracy_goal,
        typing_text_id: challenge.typing_text_id,
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
    const submissionValues = {
      ...challenge,
      ...values,
      description: values.description || null,
      // Ensure multi-text specific fields are nullified if not typer_multi_text_timed
      typing_text_ids: null,
      time_limit_seconds: null,
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
              <FormItem><FormLabel>Challenge Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="manual">Manual Completion</SelectItem><SelectItem value="task_completion">Task Completion</SelectItem><SelectItem value="typer_goal">Typer Goal</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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
                        {/* You might need to fetch typing texts here if not already available */}
                        {/* For now, assuming they are not needed for editing this type */}
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