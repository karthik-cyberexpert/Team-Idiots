"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { showSuccess, showError } from "@/utils/toast";
import { Auction, Bid } from "@/types/auction";
import { useAuth } from "@/contexts/AuthProvider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { HandCoins } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  bid_amount: z.coerce.number().int().positive("Bid must be a positive number."),
});

type FormValues = z.infer<typeof formSchema>;

interface BidWithProfile extends Bid {
  profiles: {
    full_name: string;
  } | null;
}

const fetchBids = async (auctionId: string): Promise<BidWithProfile[]> => {
  const { data, error } = await supabase
    .from("bids")
    .select(`*, profiles (full_name)`)
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const placeBid = async (values: FormValues & { auction_id: string }) => {
  const { error } = await supabase.functions.invoke("place-bid", { body: values });
  if (error) {
    if (error.context && typeof error.context.json === 'function') {
      try {
        const errorBody = await error.context.json();
        if (errorBody.error) {
          throw new Error(errorBody.error);
        }
      } catch (e) {
        console.error("Could not parse error response from edge function:", e);
      }
    }
    throw new Error(error.message);
  }
};

interface PlaceBidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auction: Auction | null;
  isFinalSeconds: boolean;
}

export const PlaceBidDialog = ({ open, onOpenChange, auction, isFinalSeconds }: PlaceBidDialogProps) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  const { data: bids, isLoading: bidsLoading } = useQuery<BidWithProfile[]>({
    queryKey: ["bids", auction?.id],
    queryFn: () => fetchBids(auction!.id),
    enabled: !!auction && open && !isFinalSeconds,
  });

  React.useEffect(() => {
    if (!auction) return;

    const channel = supabase
      .channel(`bids-for-auction-${auction.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `auction_id=eq.${auction.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bids', auction.id] });
          queryClient.invalidateQueries({ queryKey: ['liveAuctions'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auction, queryClient]);

  const mutation = useMutation({
    mutationFn: placeBid,
    onSuccess: () => {
      showSuccess("Bid placed successfully!");
      form.reset();
    },
    onError: (err: Error) => showError(err.message),
  });

  const onSubmit = (values: FormValues) => {
    if (!auction) return;
    if (profile && profile.game_points < values.bid_amount) {
      form.setError("bid_amount", { message: "Insufficient game points." });
      return;
    }
    mutation.mutate({ ...values, auction_id: auction.id });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn("sm:max-w-3xl", isFinalSeconds && "sm:max-w-md")}>
        <DialogHeader>
          <DialogTitle>Place Bid on: {auction?.auction_items.is_mystery_box ? "Mystery Box" : auction?.auction_items.name}</DialogTitle>
          <DialogDescription>
            {isFinalSeconds
              ? "Bidding is blind for the final moments!"
              : "Place a bid higher than the current price."}
            {' '}Your balance is {profile?.game_points || 0} GP.
          </DialogDescription>
        </DialogHeader>
        <div className={cn("grid gap-6 py-4", !isFinalSeconds && "md:grid-cols-2")}>
          {!isFinalSeconds && (
            <div className="space-y-2">
              <h3 className="font-semibold">Live Bidding</h3>
              <ScrollArea className="h-72 w-full rounded-md border p-2">
                {bidsLoading ? (
                  <div className="space-y-2 p-2">
                    <Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" />
                  </div>
                ) : bids && bids.length > 0 ? (
                  <ul className="space-y-2">
                    {bids.map(bid => (
                      <li key={bid.id} className="flex items-center justify-between text-sm p-2 bg-muted/50 rounded-md">
                        <div className="flex items-center gap-2">
                          <HandCoins className="h-4 w-4 text-muted-foreground" />
                          <span>
                            <span className="font-semibold">{bid.profiles?.full_name || 'A user'}</span> bid <span className="font-bold text-primary">{bid.bid_amount} GP</span>
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    No bids yet. Be the first!
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
          <div>
            {!isFinalSeconds && (
              <Card className="mb-4">
                <CardHeader className="p-4">
                  <CardDescription>Current Highest Bid</CardDescription>
                  <CardTitle className="text-3xl">{auction?.current_price} GP</CardTitle>
                  <p className="text-sm text-muted-foreground">by {auction?.profiles?.full_name || "No bids yet"}</p>
                </CardHeader>
              </Card>
            )}
            <h3 className="font-semibold mb-2">Your Bid</h3>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="bid_amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bid Amount (GP)</FormLabel>
                    <FormControl><Input type="number" placeholder="Enter your bid" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" disabled={mutation.isPending} className="w-full">
                  {mutation.isPending ? "Placing Bid..." : "Place Bid"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};