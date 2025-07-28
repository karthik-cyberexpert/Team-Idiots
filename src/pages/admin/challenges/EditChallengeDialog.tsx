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
  type: z.enum(["one-time", "daily", "weekly"]),
  is_active: z.boolean(),
});

type EditChallengeFormValues = z.infer<typeof formSchema>;

const updateChallenge = async (values: EditChallengeFormValues & { id: string }) => {
  const { error } = await supabase.functions.invoke("update-challenge", {
    body: values,
  });
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
      form.reset(challenge);
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
    mutation.mutate({ ...values, id: challenge.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
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
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="one-time">One-Time</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent></Select><FormMessage /></FormItem>
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