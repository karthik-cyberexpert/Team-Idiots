"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Auction } from "@/types/auction";
import { Skeleton } from "@/components/ui/skeleton";
import { RevealPrizeDialog } from "./RevealPrizeDialog";
import { Trophy, Gift } from "lucide-react";

const fetchMyWinnings = async (): Promise<Auction[]> => {
  const { data, error } = await supabase.functions.invoke("get-my-winnings");
  if (error) throw new Error(error.message);
  return data || [];
};

interface MyWinningsProps {
  isDialog?: boolean; // New prop to indicate if it's used inside a dialog
}

export const MyWinnings = ({ isDialog = false }: MyWinningsProps) => {
  const [auctionToReveal, setAuctionToReveal] = React.useState<Auction | null>(null);
  const { data: winnings, isLoading } = useQuery<Auction[]>({
    queryKey: ["myWinnings"],
    queryFn: fetchMyWinnings,
  });

  const handleClaim = (auction: Auction) => {
    if (auction.auction_items.is_mystery_box) {
      setAuctionToReveal(auction);
    }
    // Non-mystery box items are just visually marked as claimed for now.
  };

  if (isLoading) {
    return (
      <Card className={isDialog ? "border-none shadow-none" : ""}>
        {!isDialog && <CardHeader><CardTitle>My Winnings</CardTitle></CardHeader>}
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  if (!winnings || winnings.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Trophy className="mx-auto h-12 w-12 mb-4" />
        <p>No winnings yet. Start bidding!</p>
      </div>
    );
  }

  return (
    <>
      <RevealPrizeDialog open={!!auctionToReveal} onOpenChange={() => setAuctionToReveal(null)} auction={auctionToReveal} />
      <Card className={isDialog ? "border-none shadow-none" : ""}>
        {!isDialog && (
          <CardHeader>
            <CardTitle>My Winnings</CardTitle>
            <CardDescription>Prizes from auctions you've won.</CardDescription>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {winnings.map(auction => (
            <div key={auction.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-semibold">{auction.auction_items.name}</p>
                <p className="text-sm text-muted-foreground">Won for {auction.current_price} GP</p>
              </div>
              {auction.is_claimed ? (
                <span className="text-sm font-medium text-green-500">Claimed</span>
              ) : (
                <Button size="sm" onClick={() => handleClaim(auction)}>
                  {auction.auction_items.is_mystery_box ? (
                    <><Gift className="mr-2 h-4 w-4" /> Reveal Prize</>
                  ) : (
                    <><Trophy className="mr-2 h-4 w-4" /> Claim Item</>
                  )}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
};