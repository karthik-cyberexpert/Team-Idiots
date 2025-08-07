"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Auction, MysteryBoxContent } from "@/types/auction";
import { Skeleton } from "@/components/ui/skeleton";
import { RevealPrizeDialog } from "./RevealPrizeDialog";
import { Trophy, Gift } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const fetchMyWinnings = async (): Promise<Auction[]> => {
  const { data, error } = await supabase.functions.invoke("get-my-winnings");
  if (error) throw new Error(error.message);
  return data || [];
};

const claimPrize = async (auction_id: string): Promise<{ prize: MysteryBoxContent | null }> => {
  const { data, error } = await supabase.functions.invoke("claim-auction-prize", { body: { auction_id } });
  if (error) throw new Error(error.message);
  return data;
};

interface MyWinningsProps {
  isDialog?: boolean;
}

export const MyWinnings = ({ isDialog = false }: MyWinningsProps) => {
  const queryClient = useQueryClient();
  const [auctionToReveal, setAuctionToReveal] = React.useState<Auction | null>(null);
  const { data: winnings, isLoading } = useQuery<Auction[]>({
    queryKey: ["myWinnings"],
    queryFn: fetchMyWinnings,
  });

  const claimMutation = useMutation({
    mutationFn: claimPrize,
    onSuccess: (data) => {
      if (!data.prize) { // This was a regular item
        showSuccess("Item claimed successfully!");
      }
      // For mystery boxes, success is handled in the reveal dialog
      queryClient.invalidateQueries({ queryKey: ["myWinnings"] });
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  const handleClaim = (auction: Auction) => {
    if (auction.auction_items.is_mystery_box) {
      setAuctionToReveal(auction);
    } else {
      claimMutation.mutate(auction.id);
    }
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
                <Button 
                  size="sm" 
                  onClick={() => handleClaim(auction)}
                  disabled={claimMutation.isPending && claimMutation.variables === auction.id}
                >
                  {auction.auction_items.is_mystery_box ? (
                    <><Gift className="mr-2 h-4 w-4" /> Reveal Prize</>
                  ) : (
                    claimMutation.isPending && claimMutation.variables === auction.id ? (
                      "Claiming..."
                    ) : (
                      <><Trophy className="mr-2 h-4 w-4" /> Claim Item</>
                    )
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