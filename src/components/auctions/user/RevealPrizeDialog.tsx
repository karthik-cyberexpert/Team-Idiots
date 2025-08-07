"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showError } from "@/utils/toast";
import { Auction, MysteryBoxContent } from "@/types/auction";
import { Gift, Star, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

const claimPrize = async (auction_id: string): Promise<{ prize: MysteryBoxContent | null }> => {
  const { data, error } = await supabase.functions.invoke("claim-auction-prize", { body: { auction_id } });
  if (error) throw new Error(error.message);
  return data;
};

interface RevealPrizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auction: Auction | null;
}

export const RevealPrizeDialog = ({ open, onOpenChange, auction }: RevealPrizeDialogProps) => {
  const queryClient = useQueryClient();
  const [revealedIndex, setRevealedIndex] = React.useState<number | null>(null);
  const [revealedPrize, setRevealedPrize] = React.useState<MysteryBoxContent | null>(null);
  const [isRevealing, setIsRevealing] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setTimeout(() => {
        setRevealedIndex(null);
        setRevealedPrize(null);
        setIsRevealing(false);
      }, 300); // Delay to allow animations to finish
    }
  }, [open]);

  const mutation = useMutation({
    mutationFn: claimPrize,
    onSuccess: (data) => {
      setRevealedPrize(data.prize);
      queryClient.invalidateQueries({ queryKey: ["myWinnings"] });
      queryClient.invalidateQueries({ queryKey: ["users"] }); // To update game points/xp
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

  const PrizeIcon = ({ type }: { type: 'gp' | 'xp' }) => {
    if (type === 'gp') return <Coins className="h-8 w-8 text-vibrant-gold" />;
    return <Star className="h-8 w-8 text-vibrant-yellow" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reveal Your Mystery Prize!</DialogTitle>
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
                  {/* Card Front (Question Mark) */}
                  <div className="absolute w-full h-full flex items-center justify-center bg-primary rounded-lg shadow-lg cursor-pointer [backface-visibility:hidden]">
                    <Gift className="h-16 w-16 text-primary-foreground" />
                  </div>
                  {/* Card Back (Prize) */}
                  <div className="absolute w-full h-full flex flex-col items-center justify-center bg-card border rounded-lg shadow-lg [transform:rotateY(180deg)] [backface-visibility:hidden]">
                    {revealedPrize ? (
                      <>
                        <PrizeIcon type={revealedPrize.type} />
                        <p className="text-2xl font-bold mt-2">
                          {revealedPrize.amount > 0 ? '+' : ''}{revealedPrize.amount} {revealedPrize.type.toUpperCase()}
                        </p>
                      </>
                    ) : (
                      <Gift className="h-16 w-16 text-muted-foreground animate-pulse" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        {revealedPrize && (
          <div className="text-center">
            <p className="text-lg font-semibold">Congratulations! You've won {revealedPrize.amount} {revealedPrize.type.toUpperCase()}!</p>
            <Button className="mt-4" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};