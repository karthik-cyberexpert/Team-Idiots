"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { AuctionHistoryCard } from "./AuctionHistoryCard";

interface EndedAuction {
  id: string;
  end_time: string;
  current_price: number;
  auction_items: { name: string } | null;
  profiles: { full_name: string } | null;
}

const fetchEndedAuctions = async (): Promise<EndedAuction[]> => {
  const { data, error } = await supabase.functions.invoke("get-ended-auctions");
  if (error) throw new Error(error.message);
  return data || [];
};

interface AuctionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AuctionHistoryDialog = ({ open, onOpenChange }: AuctionHistoryDialogProps) => {
  const { data: auctions, isLoading } = useQuery<EndedAuction[]>({
    queryKey: ["endedAuctions"],
    queryFn: fetchEndedAuctions,
    enabled: open, // Only fetch when the dialog is open
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Auction History</DialogTitle>
          <DialogDescription>A record of all completed auctions.</DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
          <ScrollArea className="h-full pr-6">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
              </div>
            ) : auctions && auctions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {auctions.map(auction => (
                  <AuctionHistoryCard key={auction.id} auction={auction} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground">No auction history found.</p>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};