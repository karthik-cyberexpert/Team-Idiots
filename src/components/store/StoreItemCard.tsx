"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StoreItem } from "@/types/store";
import { Zap, Star, Gift, Coins } from "lucide-react";

interface StoreItemCardProps {
  item: StoreItem;
  onPurchase: (item: StoreItem) => void;
  isPurchasing: boolean;
  userGp: number;
}

const itemIcons: Record<StoreItem['item_type'], React.ReactNode> = {
  power_up: <Zap className="h-6 w-6 text-vibrant-yellow" />,
  xp_pack: <Star className="h-6 w-6 text-vibrant-blue" />,
  mystery_box: <Gift className="h-6 w-6 text-vibrant-purple" />,
  power_box: <Gift className="h-6 w-6 text-vibrant-pink" />,
};

export const StoreItemCard = ({ item, onPurchase, isPurchasing, userGp }: StoreItemCardProps) => {
  const canAfford = userGp >= item.price;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{item.name}</CardTitle>
          {itemIcons[item.item_type]}
        </div>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow" />
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center gap-1 font-semibold">
          <Coins className="h-5 w-5 text-vibrant-gold" />
          <span>{item.price} GP</span>
        </div>
        <Button onClick={() => onPurchase(item)} disabled={isPurchasing || !canAfford}>
          {isPurchasing ? "Purchasing..." : "Buy"}
        </Button>
      </CardFooter>
    </Card>
  );
};