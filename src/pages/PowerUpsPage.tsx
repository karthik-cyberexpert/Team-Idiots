"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { PowerUpType } from "@/types/auction";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Shield, Handshake, Swords, Sparkles, Timer, Repeat } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { TransferGpDialog } from "@/components/powerups/TransferGpDialog";
import { AttackPlayerDialog } from "@/components/powerups/AttackPlayerDialog";
import { showSuccess, showError } from "@/utils/toast";

interface UserPowerUp {
  id: string;
  power_type: PowerUpType;
  expires_at: string | null;
  is_used: boolean;
  created_at: string;
  effect_value: number | null;
  uses_left: number;
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
  '2x_boost': { icon: Zap, title: "2X Boost", description: "Doubles all XP and GP gains.", interactive: true },
  '4x_boost': { icon: Zap, title: "4X Boost", description: "Quadruples all XP and GP gains.", interactive: true },
  'shield': { icon: Shield, title: "Shield", description: "Protects you from Attacks and Siphons.", interactive: false },
  'gp_transfer': { icon: Handshake, title: "GP Siphon", description: "Siphon a percentage of another user's GP.", interactive: true },
  'attack': { icon: Swords, title: "Attack", description: "Deduct a percentage of another user's GP.", interactive: true },
  'nothing': { icon: Sparkles, title: "Dud", description: "This was a dud from a Power Box. Better luck next time!", interactive: false },
};

const PowerUpsPage = () => {
  const queryClient = useQueryClient();
  const { data: powerUps, isLoading } = useQuery<UserPowerUp[]>({
    queryKey: ["myPowerUps"],
    queryFn: fetchMyPowerUps,
    refetchInterval: 1000,
  });

  const [transferDialogOpen, setTransferDialogOpen] = React.useState(false);
  const [attackDialogOpen, setAttackDialogOpen] = React.useState(false);
  const [selectedPowerUp, setSelectedPowerUp] = React.useState<UserPowerUp | null>(null);

  const activateBoostMutation = useMutation({
    mutationFn: async (powerUpId: string) => {
      const { data, error } = await supabase.functions.invoke("activate-boost", {
        body: { powerUpId },
      });
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data) => {
      showSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["myPowerUps"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const handleUseClick = (powerUp: UserPowerUp) => {
    if (powerUp.power_type === '2x_boost' || powerUp.power_type === '4x_boost') {
      activateBoostMutation.mutate(powerUp.id);
    } else {
      setSelectedPowerUp(powerUp);
      if (powerUp.power_type === 'gp_transfer') {
        setTransferDialogOpen(true);
      } else if (powerUp.power_type === 'attack') {
        setAttackDialogOpen(true);
      }
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
              const isBoost = powerUp.power_type === '2x_boost' || powerUp.power_type === '4x_boost';
              const isActiveBoost = isBoost && powerUp.expires_at && new Date(powerUp.expires_at) > new Date();

              return (
                <Card key={powerUp.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" /> {details.title}</CardTitle>
                    <CardDescription>{details.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-between items-end">
                    <div className="text-xs text-muted-foreground space-y-1">
                      {isActiveBoost && (
                        <p className="flex items-center gap-1 text-vibrant-green font-semibold"><Timer className="h-3 w-3" /> Active! Expires {formatDistanceToNow(new Date(powerUp.expires_at!), { addSuffix: true })}</p>
                      )}
                      {powerUp.uses_left > 0 && (
                        <p className="flex items-center gap-1"><Repeat className="h-3 w-3" /> {powerUp.uses_left} use(s) left</p>
                      )}
                      {powerUp.effect_value && (
                        <p className="flex items-center gap-1"><Zap className="h-3 w-3" /> {powerUp.effect_value}% effect</p>
                      )}
                    </div>
                    {details.interactive && !isActiveBoost && (
                      <Button 
                        size="sm" 
                        onClick={() => handleUseClick(powerUp)}
                        disabled={activateBoostMutation.isPending && activateBoostMutation.variables === powerUp.id}
                      >
                        {activateBoostMutation.isPending && activateBoostMutation.variables === powerUp.id ? "Activating..." : "Use Power"}
                      </Button>
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