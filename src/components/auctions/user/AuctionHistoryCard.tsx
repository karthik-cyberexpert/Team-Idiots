"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from "date-fns";
import { Gavel, User, Calendar } from "lucide-react";

interface EndedAuction {
  id: string;
  end_time: string;
  current_price: number;
  auction_items: { name: string } | null;
  profiles: { full_name: string } | null;
}

interface AuctionHistoryCardProps {
  auction: EndedAuction;
}

export const AuctionHistoryCard = ({ auction }: AuctionHistoryCardProps) => {
  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-lg truncate">{auction.auction_items?.name || "Unknown Item"}</CardTitle>
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