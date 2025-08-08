"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Coins, Star, X, Zap, Shield, Swords, Handshake, Lock, HelpCircle } from "lucide-react";
import { PowerUpType } from "@/types/auction";

interface Activity {
  has_checked_in: boolean;
  card_choice: number | null;
}
interface Reward {
  type: 'gp' | 'xp' | 'power_up' | 'nothing';
  amount?: number;
  power?: PowerUpType;
}
interface Progress {
  claimed_cards: number[];
}

interface RewardCardsProps {
  pairId: string;
  myActivity: Activity | null;
  buddyActivity: Activity | null;
  rewardWeek: { rewards: Reward[] } | null;
  progress: Progress | null;
}

const selectCard = async ({ pairId, cardChoice }: { pairId: string; cardChoice: number }) => {
  const { data, error } = await supabase.functions.invoke("buddy-select-card", {
    body: { pairId, cardChoice },
  });
  if (error) throw new Error(error.message);
  return data;
};

const PrizeIcon = ({ reward }: { reward: Reward }) => {
  const iconProps = { className: "h-8 w-8" };
  switch (reward.type) {
    case 'gp': return <Coins {...iconProps} />;
    case 'xp': return <Star {...iconProps} />;
    case 'power_up':
      switch (reward.power) {
        case '2x_boost': case '4x_boost': return <Zap {...iconProps} />;
        case 'shield': return <Shield {...iconProps} />;
        case 'attack': return <Swords {...iconProps} />;
        case 'gp_transfer': return <Handshake {...iconProps} />;
        default: return <X {...iconProps} />;
      }
    default: return <X {...iconProps} />;
  }
};

export const RewardCards = ({ pairId, myActivity, buddyActivity, rewardWeek, progress }: RewardCardsProps) => {
  const queryClient = useQueryClient();
  const [isFlipping, setIsFlipping] = React.useState<number | null>(null);

  const mutation = useMutation({
    mutationFn: selectCard,
    onSuccess: (data) => {
      showSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["buddyRewardData", pairId] });
      queryClient.invalidateQueries({ queryKey: ["myPowerUps"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => showError(err.message),
    onSettled: () => setIsFlipping(null),
  });

  const handleCardClick = (cardIndex: number) => {
    if (isFlipping !== null) return;
    setIsFlipping(cardIndex);
    mutation.mutate({ pairId, cardChoice: cardIndex + 1 });
  };

  const bothCheckedIn = myActivity?.has_checked_in && buddyActivity?.has_checked_in;
  const myChoice = myActivity?.card_choice;
  const buddyChoice = buddyActivity?.card_choice;
  const claimedCards = progress?.claimed_cards || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 sm:gap-4 [perspective:1000px]">
        {rewardWeek?.rewards.map((reward, index) => {
          const cardNumber = index + 1;
          const isMyChoice = myChoice === cardNumber;
          const isBuddyChoice = buddyChoice === cardNumber;
          const isClaimed = claimedCards.includes(cardNumber);
          const isRevealed = isMyChoice || (isBuddyChoice && myChoice !== null) || isClaimed;
          const isDisabled = !bothCheckedIn || myChoice !== null || isClaimed || isFlipping !== null;

          return (
            <div key={index} className="w-full aspect-[3/4]" onClick={() => !isDisabled && handleCardClick(index)}>
              <div className={cn(
                "relative w-full h-full text-center transition-transform duration-700 [transform-style:preserve-3d]",
                (isRevealed || isFlipping === index) && "[transform:rotateY(180deg)]",
                !isDisabled && "cursor-pointer"
              )}>
                {/* Card Back */}
                <div className="absolute w-full h-full flex items-center justify-center bg-primary rounded-lg shadow-lg [backface-visibility:hidden]">
                  {bothCheckedIn ? <HelpCircle className="h-12 w-12 text-primary-foreground/50" /> : <Lock className="h-12 w-12 text-primary-foreground/50" />}
                </div>
                {/* Card Front */}
                <div className="absolute w-full h-full flex flex-col items-center justify-center bg-card border rounded-lg shadow-lg [transform:rotateY(180deg)] [backface-visibility:hidden]">
                  <PrizeIcon reward={reward} />
                  <p className="text-xs font-semibold mt-1">
                    {reward.type === 'gp' || reward.type === 'xp' ? `${reward.amount} ${reward.type.toUpperCase()}` : reward.power?.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!bothCheckedIn && <p className="text-center text-sm text-muted-foreground">Both you and your buddy must check in today to unlock the cards.</p>}
      {bothCheckedIn && myChoice && !buddyChoice && <p className="text-center text-sm text-muted-foreground">Your choice is locked in! Waiting for your buddy...</p>}
    </div>
  );
};