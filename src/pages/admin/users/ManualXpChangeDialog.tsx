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
import { showSuccess, showError } from "@/utils/toast";
import { User } from "@/types/user";

const formSchema = z.object({
  xpChange: z.coerce.number().int().min(-10000, { message: "XP change must be a number." }).max(10000, { message: "XP change must be a number." }),
  reason: z.string().min(5, { message: "Reason must be at least 5 characters." }),
});

type ManualXpChangeFormValues = z.infer<typeof formSchema>;

const updateUserXp = async (values: ManualXpChangeFormValues & { userId: string }) => {
  const { error } = await supabase.functions.invoke("update-user-xp", {
    body: values,
  });
  if (error) {
    throw new Error(`Failed to update user XP: ${error.message}`);
  }
};

interface ManualXpChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export const ManualXpChangeDialog = ({ open, onOpenChange, user }: ManualXpChangeDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<ManualXpChangeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      xpChange: 0,
      reason: "",
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ xpChange: 0, reason: "" });
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: updateUserXp,
    onSuccess: () => {
      showSuccess("User XP updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["xpHistory", user?.id] });
      onOpenChange(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: ManualXpChangeFormValues) => {
    if (!user) return;
    mutation.mutate({ ...values, userId: user.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Change XP for {user?.full_name}</DialogTitle>
          <DialogDescription>
            Manually adjust the XP for this user. Current XP: {user?.xp || 0}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="xpChange"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>XP Change Amount</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 50 or -20" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason for Change</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g., Awarded for special project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update XP"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};