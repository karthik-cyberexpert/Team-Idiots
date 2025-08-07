"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gavel } from 'lucide-react';
import { Auction } from "@/types/auction";
import { PlaceBidDialog } from "./PlaceBidDialog";
import { CountdownTimer } from "./CountdownTimer";
import { FinalCountdown } from "./FinalCountdown";
import { AuctionEndDisplay } from "./AuctionEndDisplay";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { cn } from "@/lib/utils";

interface AuctionCardProps {
  auction: Auction;
}

interface AuctionResult {
  winnerName: string | null;
  winningBid: number;
  winnerId: string | null;
}

export const AuctionCard = ({ auction }: AuctionCardProps) => {
  const { user } = useAuth();
  const [isBidDialogOpen, setIsBidDialogOpen] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<number>(() => 
    Math.round((new Date(auction.end_time).getTime() - Date.now()) / 1000)
  );
  const [finalResult, setFinalResult] = React.useState<AuctionResult | null>(null);
  const [isVanishing, setIsVanishing] = React.useState(false);

  const isFinalSeconds = timeLeft > 0 && timeLeft <= 30;

  const fetchResult = React.useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("get-auction-result", {
        body: { auction_id: auction.id },
      });
      if (error) throw error;
      setFinalResult(data);

      // Set a timeout to remove the card from view
      setTimeout(() => {
        setIsVanishing(true);
      }, 15000); // 15 seconds
    } catch (error) {
      console.error("Failed to fetch auction result:", error);
    }
  }, [auction.id]);

  React.useEffect(() => {
    if (timeLeft <= 0) {
      if (!finalResult) {
        fetchResult();
      }
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, fetchResult, finalResult]);

  const renderCardContent = () => {
    if (finalResult) {
      return (
        <AuctionEndDisplay
          isWinner={finalResult.winnerId === user?.id}
          winnerName={finalResult.winnerName}
          winningBid={finalResult.winningBid}
        />
      );
    }

    if (isFinalSeconds) {
      return <FinalCountdown timeLeft={timeLeft} />;
    }

    return (
      <>
        <div>
          <p className="text-sm text-muted-foreground">Current Bid</p>
          <p className="text-2xl font-bold">{auction.current_price} GP</p>
          <p className="text-xs text-muted-foreground">
            by {auction.profiles?.full_name || "No bids yet"}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Time Remaining</p>
          <CountdownTimer targetDate={auction.end_time} className="font-semibold" />
        </div>
      </>
    );
  };

  return (
    <>
      <PlaceBidDialog
        open={isBidDialogOpen}
        onOpenChange={setIsBidDialogOpen}
        auction={auction}
        isFinalSeconds={isFinalSeconds}
      />
      <Card className={cn("transition-opacity duration-500", isVanishing && "opacity-0")}>
        <CardHeader>
          <CardTitle>{auction.auction_items.name}</CardTitle>
          <CardDescription>{auction.auction_items.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {renderCardContent()}
          <Button className="w-full" onClick={() => setIsBidDialogOpen(true)} disabled={timeLeft <= 0}>
            <Gavel className="mr-2 h-4 w-4" />
            Place Bid
          </Button>
        </CardContent>
      </Card>
    </>
  );
};