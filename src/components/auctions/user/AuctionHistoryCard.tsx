"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from "date-fns";
import { Gavel, User, Calendar, Gift } from "lucide-react";

interface EndedAuction {
  id: string;
  end_time: string;
  current_price: number;
  auction_items: { 
    name: string;
    is_mystery_box: boolean;
  } | null;
  profiles: { full_name: string } | null;
}

interface AuctionHistoryCardProps {
  auction: EndedAuction;
}

export const AuctionHistoryCard = ({ auction }: AuctionHistoryCardProps) => {
  const isMysteryBox = auction.auction_items?.is_mystery_box;

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg truncate flex items-center gap-2">
          {isMysteryBox && <Gift className="h-5 w-5 text-vibrant-purple" />}
          <span>{isMysteryBox ? "Mystery Box" : auction.auction_items?.name || "Unknown Item"}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center text-muted-foreground">
          <Gavel className="h-4 w-4 mr-2" />
          <span>Won for: <span className="font-semibold text-primary">{auction.current_price} GP</span></span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <User className="h-4 w-4 mr-2" />
          <span>Winner: <span className="font-semibold text-primary">{auction.profiles?.full_name || "No Winner"}</span></span>
        </div>
        <div className="flex items-center text-muted-foreground">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Ended: {format(new Date(auction.end_time), "PPP")}</span>
        </div>
      </CardContent>
    </Card>
  );
};