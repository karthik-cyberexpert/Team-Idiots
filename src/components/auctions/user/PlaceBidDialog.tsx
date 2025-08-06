"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";
import { Auction } from "@/types/auction";
import { useAuth } from "@/contexts/AuthProvider";

const formSchema = z.object({
  bid_amount: z.coerce.number().int().positive("Bid must be a positive number."),
});

type FormValues = z.infer<typeof formSchema>;

const placeBid = async (values: FormValues & { auction_id: string }) => {
  const { error } = await supabase.functions.invoke("place-bid", { body: values });
  if (error) throw new Error(error.message);
};

interface PlaceBidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auction: Auction | null;
}

export const PlaceBidDialog = ({ open, onOpenChange, auction }: PlaceBidDialogProps) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      bid_amount: 0,
    },
  });

  React.useEffect(() => {
    if (auction && open) {
      form.setValue('bid_amount', auction.current_price + 1);
    }
  }, [auction, open, form]);

  const mutation = useMutation({
    mutationFn: placeBid,
    onSuccess: () => {
      showSuccess("Bid placed successfully!");
      queryClient.invalidateQueries({ queryKey: ["liveAuctions"] });
      queryClient.invalidateQueries({ queryKey: ["users"] }); // To update game points
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => showError(err.message),
  });

  const onSubmit = (values: FormValues) => {
    if (!auction) return;
    if (values.bid_amount <= auction.current_price) {
      form.setError("bid_amount", { message: "Bid must be higher than the current price." });
      return;
    }
    if (profile && profile.game_points < values.bid_amount) {
      form.setError("bid_amount", { message: "Insufficient game points." });
      return;
    }
    mutation.mutate({ ...values, auction_id: auction.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Place Bid on: {auction?.auction_items.name}</DialogTitle>
          <DialogDescription>
            Current price is {auction?.current_price} GP. Your balance is {profile?.game_points || 0} GP.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="bid_amount" render={({ field }) => (
              <FormItem><FormLabel>Your Bid (GP)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Placing Bid..." : "Place Bid"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};