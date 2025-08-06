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
import { AuctionItem } from "@/types/auction";

const formSchema = z.object({
  start_time: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Invalid date format" }),
  end_time: z.string().refine((val) => val && !isNaN(Date.parse(val)), { message: "Invalid date format" }),
}).refine(data => new Date(data.end_time) > new Date(data.start_time), {
  message: "End time must be after start time.",
  path: ["end_time"],
});

type FormValues = z.infer<typeof formSchema>;

const createAuction = async (values: FormValues & { item_id: string; starting_price: number }) => {
  const { error } = await supabase.functions.invoke("create-auction", { body: values });
  if (error) throw new Error(error.message);
};

interface CreateAuctionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: AuctionItem | null;
}

export const CreateAuctionDialog = ({ open, onOpenChange, item }: CreateAuctionDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      start_time: '',
      end_time: '',
    },
  });

  const mutation = useMutation({
    mutationFn: createAuction,
    onSuccess: () => {
      showSuccess("Auction scheduled successfully.");
      queryClient.invalidateQueries({ queryKey: ["auctionData"] });
      onOpenChange(false);
      form.reset();
    },
    onError: (err: Error) => showError(err.message),
  });

  const onSubmit = (values: FormValues) => {
    if (!item) return;
    mutation.mutate({ ...values, item_id: item.id, starting_price: item.starting_price });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Auction for: {item?.name}</DialogTitle>
          <DialogDescription>Set the start and end times for the auction.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="start_time" render={({ field }) => (
              <FormItem><FormLabel>Start Time</FormLabel><FormControl><Input type="datetime-local" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="end_time" render={({ field }) => (
              <FormItem><FormLabel>End Time</FormLabel><FormControl><Input type="datetime-local" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Scheduling..." : "Schedule Auction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};