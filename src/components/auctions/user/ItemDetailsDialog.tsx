"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Auction, RevealedPrize } from "@/types/auction";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Coins, Star, X, Zap, Shield, Swords, Handshake } from "lucide-react";

interface ItemDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auction: Auction | null;
}

const PrizeIcon = ({ prize }: { prize: RevealedPrize }) => {
  if (prize.type === 'gp') return <Coins className="h-8 w-8 text-vibrant-gold" />;
  if (prize.type === 'xp') return <Star className="h-8 w-8 text-vibrant-yellow" />;
  if (prize.type === 'nothing') return <X className="h-8 w-8 text-muted-foreground" />;
  if (prize.type === 'power_up') {
    switch (prize.power) {
      case '2x_boost':
      case '4x_boost':
        return <Zap className="h-8 w-8 text-vibrant-blue" />;
      case 'shield':
        return <Shield className="h-8 w-8 text-vibrant-green" />;
      case 'attack':
        return <Swords className="h-8 w-8 text-vibrant-red" />;
      case 'gp_transfer':
        return <Handshake className="h-8 w-8 text-vibrant-pink" />;
      default:
        return <X className="h-8 w-8 text-muted-foreground" />;
    }
  }
  return null;
};

const PrizeText = ({ prize }: { prize: RevealedPrize }) => {
  if (prize.type === 'gp' || prize.type === 'xp') {
    return <p className="text-2xl font-bold mt-2">{prize.amount > 0 ? '+' : ''}{prize.amount} {prize.type.toUpperCase()}</p>;
  }
  if (prize.type === 'nothing') {
    return <p className="text-lg font-semibold mt-2">You get nothing 😝</p>;
  }
  if (prize.type === 'power_up') {
    const powerLabel = prize.power.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return <p className="text-lg font-semibold mt-2">{powerLabel}</p>;
  }
  return null;
};

export const ItemDetailsDialog = ({ open, onOpenChange, auction }: ItemDetailsDialogProps) => {
  if (!auction) return null;

  const isSpecialBox = auction.auction_items.is_mystery_box || auction.auction_items.is_power_box;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{auction.auction_items.name}</DialogTitle>
          <DialogDescription>
            You won this item for {auction.current_price} GP.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isSpecialBox && auction.claimed_prize ? (
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">You received:</p>
              <div className="flex flex-col items-center justify-center mt-2">
                <PrizeIcon prize={auction.claimed_prize} />
                <PrizeText prize={auction.claimed_prize} />
              </div>
            </div>
          ) : (
            <ScrollArea className="h-48 w-full rounded-md border p-4">
              <p className="text-sm text-muted-foreground">
                {auction.auction_items.description || "No description provided."}
              </p>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};