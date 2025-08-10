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
  targetUserId: z.string().uuid({ message: "Please select a user to siphon from." }),
});

type FormValues = z.infer<typeof formSchema>;

const fetchOtherUsers = async (): Promise<OtherUser[]> => {
  const { data, error } = await supabase.functions.invoke("get-all-other-users");
  if (error) throw new Error(error.message);
  return data || [];
};

const useGpSiphon = async (values: FormValues & { powerUpId: string }): Promise<{ message: string }> => {
  const { data, error } = await supabase.functions.invoke("use-gp-transfer", { body: values });
  if (error) throw new Error(error.message);
  return data;
};

interface TransferGpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  powerUp: UserPowerUp | null;
}

export const TransferGpDialog = ({ open, onOpenChange, powerUp }: TransferGpDialogProps) => {
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
    mutationFn: useGpSiphon,
    onSuccess: (data) => {
      showSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["myPowerUps"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["gameLeaderboard"] });
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
          <DialogTitle>Siphon Game Points</DialogTitle>
          <DialogDescription>Choose a target to siphon GP from. This action is final.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="targetUserId" render={({ field }) => (
              <FormItem>
                <FormLabel>Target</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a user to siphon from" /></SelectTrigger></FormControl>
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
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Siphoning..." : "Confirm Siphon"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};