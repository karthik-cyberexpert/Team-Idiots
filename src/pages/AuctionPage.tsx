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
import { useAuth } from "@/contexts/AuthProvider";

const fetchLiveAuctions = async (): Promise<Auction[]> => {
  const { data, error } = await supabase.functions.invoke("get-live-auctions");
  if (error) throw new Error(error.message);
  return data || [];
};

const fetchMyWinnings = async (): Promise<Auction[]> => {
  const { data, error } = await supabase.functions.invoke("get-my-winnings");
  if (error) throw new Error(error.message);
  return data || [];
};

const fetchEndedAuctions = async (): Promise<Auction[]> => {
  const { data, error } = await supabase.functions.invoke("get-ended-auctions");
  if (error) throw new Error(error.message);
  return data || [];
};

const AuctionPage = () => {
  const { user } = useAuth();
  const [isWinningsDialogOpen, setIsWinningsDialogOpen] = React.useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = React.useState(false);
  const [showWinningsIndicator, setShowWinningsIndicator] = React.useState(false);
  const [showHistoryIndicator, setShowHistoryIndicator] = React.useState(false);

  const { data: auctions, isLoading } = useQuery<Auction[]>({
    queryKey: ["liveAuctions"],
    queryFn: fetchLiveAuctions,
    refetchInterval: 5000,
  });

  const { data: myWinnings } = useQuery<Auction[]>({
    queryKey: ["myWinnings"],
    queryFn: fetchMyWinnings,
    enabled: !!user,
    refetchInterval: 5000,
  });

  const { data: endedAuctions } = useQuery<Auction[]>({
    queryKey: ["endedAuctions"],
    queryFn: fetchEndedAuctions,
    refetchInterval: 5000,
  });

  React.useEffect(() => {
    const hasUnclaimed = myWinnings?.some(w => !w.is_claimed);
    setShowWinningsIndicator(!!hasUnclaimed);

    const lastHistoryView = localStorage.getItem('lastHistoryView');
    if (endedAuctions && endedAuctions.length > 0) {
      const latestEndTime = new Date(endedAuctions[0].end_time).getTime();
      if (!lastHistoryView || latestEndTime > parseInt(lastHistoryView, 10)) {
        setShowHistoryIndicator(true);
      }
    }
  }, [myWinnings, endedAuctions]);

  const handleHistoryClick = () => {
    setIsHistoryDialogOpen(true);
    localStorage.setItem('lastHistoryView', Date.now().toString());
    setShowHistoryIndicator(false);
  };

  const handleWinningsClick = () => {
    setIsWinningsDialogOpen(true);
  };

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
              onClick={handleHistoryClick} 
              className="relative transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95"
            >
              <History className="h-5 w-5" />
              {showHistoryIndicator && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-vibrant-red ring-2 ring-background" />}
              <span className="sr-only">Auction History</span>
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleWinningsClick} 
              className="relative transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95"
            >
              <Trophy className="h-5 w-5" />
              {showWinningsIndicator && <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-vibrant-red ring-2 ring-background" />}
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