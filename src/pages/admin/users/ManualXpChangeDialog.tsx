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
import { showSuccess, showError } from "@/utils/toast";
import { User } from "@/types/user";
import { Switch } from "@/components/ui/switch"; // Import Switch

const formSchema = z.object({
  xpAmount: z.coerce.number().int().min(0, { message: "XP amount must be a non-negative number." }).max(10000, { message: "XP amount must be a number." }),
  isAddition: z.boolean().default(true), // Toggle for add/deduct
});

type ManualXpChangeFormValues = z.infer<typeof formSchema>;

const updateUserXp = async (values: { userId: string; xpChange: number; reason: string }) => {
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
      xpAmount: 0,
      isAddition: true,
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ xpAmount: 0, isAddition: true });
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
    const actualXpChange = values.isAddition ? values.xpAmount : -values.xpAmount;
    const reason = values.isAddition ? `Manual XP award: ${values.xpAmount} XP` : `Manual XP deduction: ${values.xpAmount} XP`;
    mutation.mutate({ userId: user.id, xpChange: actualXpChange, reason });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-vibrant-purple dark:text-vibrant-pink">Change XP for {user?.full_name}</DialogTitle>
          <DialogDescription>
            Manually adjust the XP for this user. Current XP: <span className="font-bold text-vibrant-gold">{user?.xp || 0}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="xpAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>XP Amount</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" placeholder="e.g., 50" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isAddition"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Action</FormLabel>
                    <DialogDescription>
                      {field.value ? "Add XP" : "Deduct XP"}
                    </DialogDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
                {mutation.isPending ? "Updating..." : "Update XP"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};