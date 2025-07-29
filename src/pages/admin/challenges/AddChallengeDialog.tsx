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
import { TypingText } from "@/types/typing-text";

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  xp_reward: z.coerce.number().int().min(0, "XP reward must be non-negative."),
  game_points_reward: z.coerce.number().int().min(0, "Game points reward must be non-negative."),
  type: z.enum(["one-time", "daily", "weekly"]),
  is_active: z.boolean().default(true),
  challenge_type: z.enum(["manual", "task_completion", "typer_goal"]), // Removed 'typer_multi_text_timed'
  related_task_id: z.string().uuid().nullable().optional(), // For task_completion
  typer_wpm_goal: z.coerce.number().int().min(1, "WPM goal must be at least 1.").optional().nullable(), // For typer_goal
  typer_accuracy_goal: z.coerce.number().min(0).max(100, "Accuracy goal must be between 0 and 100.").optional().nullable(), // For typer_goal
  typing_text_id: z.string().uuid().nullable().optional(), // For typer_goal
});

type AddChallengeFormValues = z.infer<typeof formSchema>;

const fetchTypingTexts = async (): Promise<TypingText[]> => {
  const { data, error } = await supabase.from("typing_texts").select("id, title");
  if (error) throw new Error(error.message);
  return data;
};

const createChallenge = async (values: AddChallengeFormValues) => {
  const { error } = await supabase.functions.invoke("create-challenge", { body: values });
  if (error) throw new Error(error.message);
};

interface AddChallengeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddChallengeDialog = ({ open, onOpenChange }: AddChallengeDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<AddChallengeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      xp_reward: 0,
      game_points_reward: 0,
      type: "one-time",
      is_active: true,
      challenge_type: "manual",
      related_task_id: null,
      typer_wpm_goal: null,
      typer_accuracy_goal: null,
      typing_text_id: null,
    },
  });

  const { data: typingTexts, isLoading: typingTextsLoading } = useQuery<TypingText[]>({
    queryKey: ["typingTextsForChallenges"],
    queryFn: fetchTypingTexts,
    enabled: open, // Only fetch when dialog is open
  });

  React.useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: createChallenge,
    onSuccess: () => {
      showSuccess("Challenge created successfully.");
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      onOpenChange(false);
    },
    onError: (err) => showError(err.message),
  });

  const onSubmit = (values: AddChallengeFormValues) => {
    // Clean up fields not relevant to the selected challenge_type
    const submissionValues = { ...values };
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
          <DialogTitle>Create New Challenge</DialogTitle>
          <DialogDescription>Define the details for your new challenge.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
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

            {/* Add fields for related_task_id if challenge_type is 'task_completion' here if needed */}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create Challenge"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};