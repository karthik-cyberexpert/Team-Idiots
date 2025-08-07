"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Auction, MysteryBoxContent } from "@/types/auction";
import { Skeleton } from "@/components/ui/skeleton";
import { RevealPrizeDialog } from "./RevealPrizeDialog";
import { ItemDetailsDialog } from "./ItemDetailsDialog";
import { Trophy, Gift, Eye } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { useAuth } from "@/contexts/AuthProvider";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

const fetchMyWinnings = async (): Promise<Auction[]> => {
  const { data, error } = await supabase.functions.invoke("get-my-winnings");
  if (error) throw new Error(error.message);
  return data || [];
};

const claimPrize = async (auction_id: string): Promise<{ prize: MysteryBoxContent | null; message: string }> => {
  const { data, error } = await supabase.functions.invoke("claim-auction-prize", { body: { auction_id } });
  if (error) throw new Error(error.message);
  return data;
};

interface MyWinningsProps {
  isDialog?: boolean;
}

export const MyWinnings = ({ isDialog = false }: MyWinningsProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [auctionToReveal, setAuctionToReveal] = React.useState<Auction | null>(null);
  const [itemToShowDetails, setItemToShowDetails] = React.useState<Auction | null>(null);
  const { data: winnings, isLoading } = useQuery<Auction[]>({
    queryKey: ["myWinnings"],
    queryFn: fetchMyWinnings,
  });

  const claimMutation = useMutation({
    mutationFn: (auction: Auction) => claimPrize(auction.id),
    onSuccess: (data, auction) => {
      showSuccess(data.message);
      
      if (!auction.auction_items.is_mystery_box) {
        setItemToShowDetails(auction);
      }
      
      queryClient.invalidateQueries({ queryKey: ["myWinnings"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["xpHistory", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  const handleClaim = (auction: Auction) => {
    if (auction.auction_items.is_mystery_box) {
      setAuctionToReveal(auction);
    } else {
      claimMutation.mutate(auction);
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
      <ItemDetailsDialog open={!!itemToShowDetails} onOpenChange={() => setItemToShowDetails(null)} auction={itemToShowDetails} />
      <Card className={isDialog ? "border-none shadow-none" : ""}>
        {!isDialog && (
          <CardHeader>
            <CardTitle>My Winnings</CardTitle>
            <CardDescription>Prizes from auctions you've won.</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <ScrollArea className="h-[250px] pr-4">
            <div className="space-y-4">
              {winnings.map(auction => (
                <div key={auction.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-semibold">{auction.auction_items.name}</p>
                    <p className="text-sm text-muted-foreground">Won for {auction.current_price} GP</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(auction.end_time), "PPP 'at' p")}
                    </p>
                  </div>
                  {auction.is_claimed ? (
                    <Button variant="outline" size="sm" onClick={() => setItemToShowDetails(auction)}>
                      <Eye className="mr-2 h-4 w-4" /> View Details
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleClaim(auction)}
                      disabled={claimMutation.isPending && claimMutation.variables?.id === auction.id}
                    >
                      {auction.auction_items.is_mystery_box ? (
                        <><Gift className="mr-2 h-4 w-4" /> Reveal Prize</>
                      ) : (
                        claimMutation.isPending && claimMutation.variables?.id === auction.id ? (
                          "Claiming..."
                        ) : (
                          <><Trophy className="mr-2 h-4 w-4" /> Claim Item</>
                        )
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </>
  );
};