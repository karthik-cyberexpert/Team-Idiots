import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from '@/components/ui/button';
import { Trophy, History } from 'lucide-react';
import { Auction } from "@/types/auction";
import { Skeleton } from "@/components/ui/skeleton";
import { MyWinningsDialog } from "@/components/auctions/user/MyWinningsDialog";
import { AuctionCard } from "@/components/auctions/user/AuctionCard";
import { AuctionHistoryDialog } from "@/components/auctions/user/AuctionHistoryDialog";

const fetchLiveAuctions = async (): Promise<Auction[]> => {
  const { data, error } = await supabase.functions.invoke("get-live-auctions");
  if (error) throw new Error(error.message);
  return data || [];
};

const AuctionPage = () => {
  const [isWinningsDialogOpen, setIsWinningsDialogOpen] = React.useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = React.useState(false);
  const { data: auctions, isLoading } = useQuery<Auction[]>({
    queryKey: ["liveAuctions"],
    queryFn: fetchLiveAuctions,
    refetchInterval: 30000, // Refetch every 30 seconds to get new auctions
  });

  return (
    <>
      <MyWinningsDialog open={isWinningsDialogOpen} onOpenChange={setIsWinningsDialogOpen} />
      <AuctionHistoryDialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen} />
      
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Live Auctions</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsHistoryDialogOpen(true)} 
              className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95"
            >
              <History className="h-5 w-5" />
              <span className="sr-only">Auction History</span>
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setIsWinningsDialogOpen(true)} 
              className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95"
            >
              <Trophy className="h-5 w-5" />
              <span className="sr-only">My Winnings</span>
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
            <Skeleton className="h-80 w-full" />
          </div>
        ) : !auctions || auctions.length === 0 ? (
          <p className="mt-4 text-muted-foreground">No live auctions at the moment. Check back later!</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default AuctionPage;