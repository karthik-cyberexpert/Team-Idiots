"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showError } from "@/utils/toast";
import { Auction, MysteryBoxContent, PowerUpType } from "@/types/auction";
import { Gift, Star, Coins, Zap, Shield, X, Handshake, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

type RevealedPrize = (MysteryBoxContent & { power?: never }) | { type: 'power_up'; power: PowerUpType; amount?: never };

const claimPrize = async (auction_id: string): Promise<{ prize: RevealedPrize | null }> => {
  const { data, error } = await supabase.functions.invoke("claim-auction-prize", { body: { auction_id } });
  if (error) throw new Error(error.message);
  return data;
};

interface RevealPrizeDialogProps {
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

export const RevealPrizeDialog = ({ open, onOpenChange, auction }: RevealPrizeDialogProps) => {
  const queryClient = useQueryClient();
  const [revealedIndex, setRevealedIndex] = React.useState<number | null>(null);
  const [revealedPrize, setRevealedPrize] = React.useState<RevealedPrize | null>(null);
  const [isRevealing, setIsRevealing] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setRevealedIndex(null);
        setRevealedPrize(null);
        setIsRevealing(false);
      }, 300);
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: claimPrize,
    onSuccess: (data) => {
      setRevealedPrize(data.prize);
      queryClient.invalidateQueries({ queryKey: ["myWinnings"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => {
      showError(err.message);
      setIsRevealing(false);
      setRevealedIndex(null);
    },
  });

  const handleCardClick = (index: number) => {
    if (isRevealing || revealedIndex !== null || !auction) return;
    setIsRevealing(true);
    setRevealedIndex(index);
    mutation.mutate(auction.id);
  };

  const boxType = auction?.auction_items.is_power_box ? 'Power Box' : 'Mystery Prize';
  const BoxIcon = auction?.auction_items.is_power_box ? Zap : Gift;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reveal Your {boxType}!</DialogTitle>
          <DialogDescription>Pick one card to reveal your prize.</DialogDescription>
        </DialogHeader>
        <div className="py-8 [perspective:1000px]">
          <div className="grid grid-cols-3 gap-4">
            {[0, 1, 2].map(index => (
              <div key={index} className="w-full h-48" onClick={() => handleCardClick(index)}>
                <div
                  className={cn(
                    "relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d]",
                    revealedIndex === index && "[transform:rotateY(180deg)]"
                  )}
                >
                  <div className="absolute w-full h-full flex items-center justify-center bg-primary rounded-lg shadow-lg cursor-pointer [backface-visibility:hidden]">
                    <BoxIcon className="h-16 w-16 text-primary-foreground" />
                  </div>
                  <div className="absolute w-full h-full flex flex-col items-center justify-center bg-card border rounded-lg shadow-lg [transform:rotateY(180deg)] [backface-visibility:hidden]">
                    {revealedPrize ? (
                      <>
                        <PrizeIcon prize={revealedPrize} />
                        <PrizeText prize={revealedPrize} />
                      </>
                    ) : (
                      <BoxIcon className="h-16 w-16 text-muted-foreground animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {revealedPrize && (
          <div className="text-center">
            <p className="text-lg font-semibold">Congratulations!</p>
            <Button className="mt-4" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};