"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Rocket, Zap, Loader2 } from "lucide-react";
import { BossBattle } from "@/types/spacebossbattle";
import { BattleArena } from "@/components/spacebossbattle/BattleArena";
import { BattleLobby } from "@/components/spacebossbattle/BattleLobby";
import { showSuccess, showError } from "@/utils/toast";
import { Button } from "@/components/ui/button";

const fetchActiveBattles = async (): Promise<BossBattle[]> => {
  const { data, error } = await supabase.functions.invoke("get-active-boss-battles");
  if (error) throw new Error(error.message);
  return data || [];
};

const joinBattle = async (battleId: string): Promise<BossBattle> => {
  const { data, error } = await supabase.functions.invoke("join-boss-battle", { body: { battleId } });
  if (error) throw new Error(error.message);
  return data;
};

const SpaceBossBattlePage = () => {
  const queryClient = useQueryClient();
  const [currentBattle, setCurrentBattle] = React.useState<BossBattle | null>(null);

  const { data: availableBattles, isLoading, error } = useQuery<BossBattle[]>({
    queryKey: ["activeBossBattles"],
    queryFn: fetchActiveBattles,
    refetchInterval: 5000,
  });

  const joinMutation = useMutation({
    mutationFn: joinBattle,
    onSuccess: (battle) => {
      showSuccess(`Joined battle: ${battle.title}`);
      setCurrentBattle(battle);
      queryClient.invalidateQueries({ queryKey: ["activeBossBattles"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  // Handle real-time updates for the current battle
  React.useEffect(() => {
    if (!currentBattle) return;

    const channel = supabase
      .channel(`boss-battle-${currentBattle.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'boss_battles', filter: `id=eq.${currentBattle.id}` },
        (payload) => {
          const updatedBattle = payload.new as BossBattle;
          setCurrentBattle(updatedBattle);
          if (updatedBattle.status === 'ended') {
            showSuccess(`Battle ${updatedBattle.title} has ended!`);
            queryClient.invalidateQueries({ queryKey: ["activeBossBattles"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentBattle, queryClient]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
  }

  if (currentBattle && currentBattle.status === 'in_progress') {
    return <BattleArena battle={currentBattle} />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-vibrant-purple"><Rocket className="h-6 w-6" /> Space Boss Battle Center</h1>
      
      {availableBattles && availableBattles.length > 0 ? (
        <>
          <p className="text-muted-foreground">Active and upcoming battles:</p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableBattles.map(battle => (
              <BattleLobby 
                key={battle.id} 
                battle={battle} 
                onJoin={(id) => joinMutation.mutate(id)} 
                isJoining={joinMutation.isPending}
              />
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-10 text-muted-foreground">
          <Zap className="mx-auto h-12 w-12 mb-4" />
          <p className="text-lg">No active battles right now.</p>
          <p>Check back later or request a new battle from an admin!</p>
        </div>
      )}
      
      {joinMutation.isPending && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
    </div>
  );
};

export default SpaceBossBattlePage;