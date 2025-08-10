"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BoxContent } from "@/types/store";
import { Coins, Star, X, Zap, Shield, Swords, Handshake } from "lucide-react";
import Confetti from 'react-dom-confetti';
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrizeRevealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prizes: BoxContent[] | null;
}

const PrizeIcon = ({ prize }: { prize: BoxContent }) => {
  const iconProps = { className: "h-8 w-8" };
  switch (prize.type) {
    case 'gp': return <Coins {...iconProps} className="text-vibrant-gold" />;
    case 'xp': return <Star {...iconProps} className="text-vibrant-yellow" />;
    case 'power_up':
      switch (prize.power) {
        case '2x_boost': case '4x_boost': return <Zap {...iconProps} className="text-vibrant-blue" />;
        case 'shield': return <Shield {...iconProps} className="text-vibrant-green" />;
        case 'attack': return <Swords {...iconProps} className="text-vibrant-red" />;
        case 'gp_transfer': return <Handshake {...iconProps} className="text-vibrant-pink" />;
        default: return <X {...iconProps} className="text-muted-foreground" />;
      }
    default: return <X {...iconProps} className="text-muted-foreground" />;
  }
};

const PrizeText = ({ prize }: { prize: BoxContent }) => {
  if (prize.type === 'gp' || prize.type === 'xp') {
    return <p className="text-lg font-semibold">{prize.amount} {prize.type.toUpperCase()}</p>;
  }
  if (prize.type === 'nothing') {
    return <p className="text-lg font-semibold">Nothing!</p>;
  }
  if (prize.type === 'power_up') {
    const powerLabel = prize.power?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return <p className="text-lg font-semibold">{powerLabel}</p>;
  }
  return null;
};

export const PrizeRevealDialog = ({ open, onOpenChange, prizes }: PrizeRevealDialogProps) => {
  const [confettiActive, setConfettiActive] = React.useState(false);

  React.useEffect(() => {
    if (open && prizes && prizes.some(p => p.type !== 'nothing')) {
      const timer = setTimeout(() => setConfettiActive(true), 300);
      return () => clearTimeout(timer);
    } else {
      setConfettiActive(false);
    }
  }, [open, prizes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>You got...</DialogTitle>
          <DialogDescription>Here's what was inside the box(es)!</DialogDescription>
        </DialogHeader>
        <div className="py-8 flex flex-col items-center justify-center relative">
          <Confetti active={confettiActive} />
          {prizes && prizes.length > 0 ? (
            <ScrollArea className="h-48 w-full">
              <div className="space-y-4 pr-4">
                {prizes.map((prize, index) => (
                  <div key={index} className="flex items-center gap-4 p-2 border rounded-md">
                    <PrizeIcon prize={prize} />
                    <PrizeText prize={prize} />
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p>Revealing prize...</p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Awesome!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};