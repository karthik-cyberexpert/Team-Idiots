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

const formSchema = z.object({
  title: z.string().min(1, "Title is required."),
  description: z.string().optional(),
  xp_reward: z.coerce.number().int().min(0, "XP reward must be non-negative."),
  type: z.enum(["one-time", "daily", "weekly"]),
  is_active: z.boolean(),
});

type AddChallengeFormValues = z.infer<typeof formSchema>;

const createChallenge = async (values: AddChallengeFormValues) => {
  const { error } = await supabase.functions.invoke("create-challenge", {
    body: values,
  });
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
      xp_reward: 10,
      type: "one-time",
      is_active: true,
    },
  });

  const mutation = useMutation({
    mutationFn: createChallenge,
    onSuccess: () => {
      showSuccess("Challenge created successfully.");
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => showError(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Challenge</DialogTitle>
          <DialogDescription>Fill in the details for the new challenge.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(mutation.mutate)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="xp_reward" render={({ field }) => (
              <FormItem><FormLabel>XP Reward</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="type" render={({ field }) => (
              <FormItem><FormLabel>Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="one-time">One-Time</SelectItem><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem></SelectContent></Select><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3"><FormLabel>Active</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Creating..." : "Create"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};