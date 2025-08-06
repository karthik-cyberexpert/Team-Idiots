import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gavel } from 'lucide-react';
import { Auction } from "@/types/auction";
import { Skeleton } from "@/components/ui/skeleton";
import { PlaceBidDialog } from "@/components/auctions/user/PlaceBidDialog";
import { CountdownTimer } from "@/components/auctions/CountdownTimer";

const fetchLiveAuctions = async (): Promise<Auction[]> => {
  const { data, error } = await supabase.functions.invoke("get-live-auctions");
  if (error) throw new Error(error.message);
  return data || [];
};

const AuctionPage = () => {
  const [auctionToBid, setAuctionToBid] = React.useState<Auction | null>(null);
  const { data: auctions, isLoading, refetch } = useQuery<Auction[]>({
    queryKey: ["liveAuctions"],
    queryFn: fetchLiveAuctions,
  });

  return (
    <>
      <PlaceBidDialog open={!!auctionToBid} onOpenChange={() => setAuctionToBid(null)} auction={auctionToBid} />
      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Live Auctions</h1>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : !auctions || auctions.length === 0 ? (
          <p>No live auctions at the moment. Check back later!</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {auctions.map((auction) => (
              <Card key={auction.id}>
                <CardHeader>
                  <CardTitle>{auction.auction_items.name}</CardTitle>
                  <CardDescription>{auction.auction_items.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Bid</p>
                    <p className="text-2xl font-bold">{auction.current_price} GP</p>
                    <p className="text-xs text-muted-foreground">
                      by {auction.profiles?.full_name || "No bids yet"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Remaining</p>
                    <CountdownTimer targetDate={auction.end_time} onEnd={refetch} className="font-semibold" />
                  </div>
                  <Button className="w-full" onClick={() => setAuctionToBid(auction)}>
                    <Gavel className="mr-2 h-4 w-4" />
                    Place Bid
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AuctionPage;