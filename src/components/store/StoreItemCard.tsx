"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StoreItem } from "@/types/store";
import { Zap, Star, Gift, Coins } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface GlobalOffer {
  enabled: boolean;
  discount_percentage: number;
  start_time: string;
  end_time: string;
}

interface StoreItemCardProps {
  item: StoreItem;
  onPurchase: (item: StoreItem) => void;
  isPurchasing: boolean;
  userGp: number;
  globalOffer: GlobalOffer | null;
}

const itemIcons: Record<StoreItem['item_type'], React.ReactNode> = {
  power_up: <Zap className="h-6 w-6 text-vibrant-yellow" />,
  xp_pack: <Star className="h-6 w-6 text-vibrant-blue" />,
  mystery_box: <Gift className="h-6 w-6 text-vibrant-purple" />,
  power_box: <Gift className="h-6 w-6 text-vibrant-pink" />,
};

const isOfferActive = (offer: GlobalOffer | null) => {
  if (!offer || !offer.enabled) return false;
  const now = new Date();
  const start = new Date(offer.start_time);
  const end = new Date(offer.end_time);
  return now >= start && now <= end;
};

export const StoreItemCard = ({ item, onPurchase, isPurchasing, userGp, globalOffer }: StoreItemCardProps) => {
  const onSale = isOfferActive(globalOffer);
  const discountedPrice = onSale ? Math.round(item.price * (1 - (globalOffer?.discount_percentage || 0) / 100)) : item.price;
  const canAfford = userGp >= discountedPrice;

  return (
    <Card className="flex flex-col relative">
      {onSale && <Badge className="absolute -top-2 -right-2">SALE</Badge>}
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle>{item.name}</CardTitle>
          {itemIcons[item.item_type]}
        </div>
        <CardDescription>{item.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow" />
      <CardFooter className="flex justify-between items-center">
        <div className="flex items-center gap-2 font-semibold">
          <Coins className="h-5 w-5 text-vibrant-gold" />
          {onSale ? (
            <div className="flex items-baseline gap-2">
              <span className="text-xl text-vibrant-green">{discountedPrice} GP</span>
              <del className="text-sm text-muted-foreground">{item.price} GP</del>
            </div>
          ) : (
            <span>{item.price} GP</span>
          )}
        </div>
        <Button onClick={() => onPurchase(item)} disabled={isPurchasing || !canAfford}>
          {isPurchasing ? "Purchasing..." : "Buy"}
        </Button>
      </CardFooter>
    </Card>
  );
};