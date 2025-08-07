"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";

interface UserPowerUp {
  id: string;
}

interface OtherUser {
  id: string;
  full_name: string;
}

const formSchema = z.object({
  targetUserId: z.string().uuid({ message: "Please select a user to attack." }),
});

type FormValues = z.infer<typeof formSchema>;

const fetchOtherUsers = async (): Promise<OtherUser[]> => {
  const { data, error } = await supabase.functions.invoke("get-all-other-users");
  if (error) throw new Error(error.message);
  return data || [];
};

const useAttack = async (values: FormValues & { powerUpId: string }): Promise<{ message: string }> => {
  const { data, error } = await supabase.functions.invoke("use-attack", { body: values });
  if (error) throw new Error(error.message);
  return data;
};

interface AttackPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  powerUp: UserPowerUp | null;
}

export const AttackPlayerDialog = ({ open, onOpenChange, powerUp }: AttackPlayerDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const { data: users, isLoading: usersLoading } = useQuery<OtherUser[]>({
    queryKey: ["allOtherUsers"],
    queryFn: fetchOtherUsers,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: useAttack,
    onSuccess: (data) => {
      showSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["myPowerUps"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (err: Error) => showError(err.message),
  });

  const onSubmit = (values: FormValues) => {
    if (!powerUp) return;
    mutation.mutate({ ...values, powerUpId: powerUp.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attack a Player</DialogTitle>
          <DialogDescription>Choose a target. This will deduct 10% of their GP. This action is final.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="targetUserId" render={({ field }) => (
              <FormItem>
                <FormLabel>Target</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a user to attack" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {usersLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : users?.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" variant="destructive" disabled={mutation.isPending}>
                {mutation.isPending ? "Attacking..." : "Launch Attack"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};