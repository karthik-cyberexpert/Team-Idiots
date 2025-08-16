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
import { Switch } from "@/components/ui/switch";

const formSchema = z.object({
  gamePointsAmount: z.coerce.number().int().min(0, { message: "Game points amount must be a non-negative number." }).max(10000, { message: "Amount must be a number." }),
  isAddition: z.boolean().default(true),
});

type ManualGamePointsChangeFormValues = z.infer<typeof formSchema>;

const updateUserGamePoints = async (values: { userId: string; gamePointsChange: number }) => {
  const { error } = await supabase.functions.invoke("update-user-game-points", {
    body: values,
  });
  if (error) {
    throw new Error(`Failed to update user game points: ${error.message}`);
  }
};

interface ManualGamePointsChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
}

export const ManualGamePointsChangeDialog = ({ open, onOpenChange, user }: ManualGamePointsChangeDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<ManualGamePointsChangeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gamePointsAmount: 0,
      isAddition: true,
    },
  });

  React.useEffect(() => {
    if (!open) {
      form.reset({ gamePointsAmount: 0, isAddition: true });
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: updateUserGamePoints,
    onSuccess: () => {
      showSuccess("User game points updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["gameLeaderboard"] });
      onOpenChange(false);
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const onSubmit = (values: ManualGamePointsChangeFormValues) => {
    if (!user) return;
    const actualGamePointsChange = values.isAddition ? values.gamePointsAmount : -values.gamePointsAmount;
    mutation.mutate({ userId: user.id, gamePointsChange: actualGamePointsChange });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-vibrant-purple dark:text-vibrant-pink">Change Game Points for {user?.full_name}</DialogTitle>
          <DialogDescription>
            Manually adjust the game points for this user. Current GP: <span className="font-bold text-vibrant-gold">{user?.game_points || 0}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="gamePointsAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Game Points (GP) Amount</FormLabel>
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
                      {field.value ? "Add GP" : "Deduct GP"}
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
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update GP"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};