"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { PowerUpType } from "@/types/auction";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Shield, Handshake, Swords, Sparkles, Timer } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TransferGpDialog } from "@/components/powerups/TransferGpDialog";
import { AttackPlayerDialog } from "@/components/powerups/AttackPlayerDialog";

interface UserPowerUp {
  id: string;
  power_type: PowerUpType;
  expires_at: string | null;
  is_used: boolean;
  created_at: string;
}

const fetchMyPowerUps = async (): Promise<UserPowerUp[]> => {
  const { data, error } = await supabase
    .from("user_power_ups")
    .select("*")
    .eq("is_used", false)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const powerUpDetails: Record<PowerUpType, { icon: React.ElementType; title: string; description: string; interactive: boolean }> = {
  '2x_boost': { icon: Zap, title: "2X Boost", description: "Doubles all XP and GP gains for 24 hours.", interactive: false },
  '4x_boost': { icon: Zap, title: "4X Boost", description: "Quadruples all XP and GP gains for 24 hours.", interactive: false },
  'shield': { icon: Shield, title: "Shield", description: "Automatically protects you from one Attack.", interactive: false },
  'gp_transfer': { icon: Handshake, title: "GP Siphon", description: "Siphon up to 15% of another user's GP. Can be blocked by a Shield.", interactive: true },
  'attack': { icon: Swords, title: "Attack", description: "Deduct 10% of another user's GP. Can be blocked by a Shield.", interactive: true },
  'nothing': { icon: Sparkles, title: "Dud", description: "This was a dud from a Power Box. Better luck next time!", interactive: false },
};

const PowerUpsPage = () => {
  const { data: powerUps, isLoading } = useQuery<UserPowerUp[]>({
    queryKey: ["myPowerUps"],
    queryFn: fetchMyPowerUps,
    refetchInterval: 1000, // Refetch every 1 second
  });

  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false);
  const [attackDialogOpen, setAttackDialogOpen] = React.useState(false);
  const [selectedPowerUp, setSelectedPowerUp] = React.useState<UserPowerUp | null>(null);

  const handleUseClick = (powerUp: UserPowerUp) => {
    setSelectedPowerUp(powerUp);
    if (powerUp.power_type === 'gp_transfer') {
      setTransferDialogOpen(true);
    } else if (powerUp.power_type === 'attack') {
      setAttackDialogOpen(true);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
      </div>
    );
  }

  return (
    <>
      <TransferGpDialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen} powerUp={selectedPowerUp} />
      <AttackPlayerDialog open={attackDialogOpen} onOpenChange={setAttackDialogOpen} powerUp={selectedPowerUp} />
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">My Power-ups</h1>
          <p className="text-muted-foreground">Your inventory of special abilities from Power Boxes.</p>
        </div>
        {powerUps && powerUps.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {powerUps.map(powerUp => {
              const details = powerUpDetails[powerUp.power_type];
              const Icon = details.icon;
              return (
                <Card key={powerUp.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> {details.title}</CardTitle>
                    <CardDescription>{details.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-end">
                    <div className="text-xs text-muted-foreground">
                      {powerUp.expires_at ? (
                        <p className="flex items-center gap-1"><Timer className="h-3 w-3" /> Expires {formatDistanceToNow(new Date(powerUp.expires_at), { addSuffix: true })}</p>
                      ) : (
                        <p>Single Use</p>
                      )}
                    </div>
                    {details.interactive && (
                      <Button size="sm" onClick={() => handleUseClick(powerUp)}>Use Power</Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Zap className="mx-auto h-12 w-12 mb-4" />
            <p>Your power-up inventory is empty. Win Power Boxes in auctions to get some!</p>
          </div>
        )}
      </div>
    </>
  );
};

export default PowerUpsPage;