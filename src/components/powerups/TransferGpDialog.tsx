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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";

interface UserPowerUp {
  id: string;
}

interface OtherUser {
  id: string;
  full_name: string;
}

const formSchema = z.object({
  targetUserId: z.string().uuid({ message: "Please select a user." }),
  percentage: z.coerce.number().int().min(1, "Percentage must be at least 1%.").max(15, "Percentage cannot exceed 15%."),
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
  const { profile } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      percentage: 15,
    },
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
      queryClient.invalidateQueries({ queryKey: ["users"] }); // To update GP in admin list
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
          <DialogDescription>Choose a target and a percentage of their GP to siphon. Max 15%.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="targetUserId" render={({ field }) => (
              <FormItem>
                <FormLabel>Target</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a user to siphon GP from" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {usersLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> : users?.map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="percentage" render={({ field }) => (
              <FormItem>
                <FormLabel>Percentage to Siphon (1-15%)</FormLabel>
                <FormControl><Input type="number" min="1" max="15" {...field} /></FormControl>
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