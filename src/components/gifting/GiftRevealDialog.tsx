"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Notification } from "@/types/notification";
import { Gift, Coins, Star, Zap, Shield, Swords, Handshake, X } from "lucide-react";
import { showError } from "@/utils/toast";
import "./GiftRevealDialog.css";
import { cn } from "@/lib/utils";

const claimGift = async (notificationId: string) => {
  const { error } = await supabase.functions.invoke("claim-gift", { body: { notificationId } });
  if (error) throw new Error(error.message);
};

const PrizeIcon = ({ prize }: { prize: Notification['gift_payload'] }) => {
  if (!prize) return null;
  const iconProps = { className: "h-16 w-16" };
  switch (prize.type) {
    case 'gp': return <Coins {...iconProps} className="text-vibrant-gold" />;
    case 'xp': return <Star {...iconProps} className="text-vibrant-yellow" />;
    case 'power_up':
      switch (prize.power_up?.power) {
        case '2x_boost': case '4x_boost': return <Zap {...iconProps} className="text-vibrant-blue" />;
        case 'shield': return <Shield {...iconProps} className="text-vibrant-green" />;
        case 'attack': return <Swords {...iconProps} className="text-vibrant-red" />;
        case 'gp_transfer': return <Handshake {...iconProps} className="text-vibrant-pink" />;
        default: return <X {...iconProps} className="text-muted-foreground" />;
      }
    default: return <X {...iconProps} className="text-muted-foreground" />;
  }
};

const PrizeText = ({ prize }: { prize: Notification['gift_payload'] }) => {
  if (!prize) return null;
  if (prize.type === 'gp' || prize.type === 'xp') {
    return <p className="text-2xl font-bold mt-2">{prize.amount} {prize.type.toUpperCase()}</p>;
  }
  if (prize.type === 'power_up') {
    const powerLabel = prize.power_up?.power?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return <p className="text-2xl font-bold mt-2">{powerLabel}</p>;
  }
  return null;
};

interface GiftRevealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: Notification | null;
}

export const GiftRevealDialog = ({ open, onOpenChange, notification }: GiftRevealDialogProps) => {
  const queryClient = useQueryClient();
  const [isOpened, setIsOpened] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      // Reset state after dialog closes
      setTimeout(() => setIsOpened(false), 300);
    }
  }, [open]);

  const claimMutation = useMutation({
    mutationFn: () => claimGift(notification!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["myPowerUps"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const handleOpenGift = () => {
    if (isOpened || !notification || notification.gift_payload?.is_claimed) return;
    setIsOpened(true);
    claimMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>A Gift For You!</DialogTitle>
          <DialogDescription>From: {notification?.gift_payload?.sender_name}</DialogDescription>
        </DialogHeader>
        <div className="py-8 flex flex-col items-center justify-center space-y-4">
          <p className="italic text-center">"{notification?.gift_payload?.message}"</p>
          <div className="gift-box-container" onClick={handleOpenGift}>
            <div className={cn("gift-box", isOpened && "opened")}>
              <div className="gift-box-lid">
                <div className="gift-box-bow"></div>
              </div>
              <div className="gift-box-body"></div>
            </div>
            {isOpened && (
              <div className="prize-reveal">
                <PrizeIcon prize={notification?.gift_payload} />
              </div>
            )}
          </div>
          {isOpened && (
            <div className="text-center animate-fade-in">
              <p className="text-lg">You received:</p>
              <PrizeText prize={notification?.gift_payload} />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};