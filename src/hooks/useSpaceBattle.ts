import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SpaceBattle, SpaceBattleParticipant, SpaceBattleLog } from "@/types/space-boss";
import { useToast } from "@/hooks/use-toast";

export function useSpaceBattle(battleId: string, initialBattle: SpaceBattle) {
  const [battle, setBattle] = useState<SpaceBattle>(initialBattle);
  const [participants, setParticipants] = useState<SpaceBattleParticipant[]>([]);
  const [logs, setLogs] = useState<SpaceBattleLog[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Initial fetch of participants
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from("space_battle_participants")
        .select("*")
        .eq("battle_id", battleId);
      if (data) setParticipants(data as SpaceBattleParticipant[]);
    };
    fetchParticipants();

    // Subscribe to Battle Updates
    const battleSub = supabase
      .channel(`battle-${battleId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "space_battles", filter: `id=eq.${battleId}` },
        (payload) => {
          setBattle(payload.new as SpaceBattle);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "space_battle_participants", filter: `battle_id=eq.${battleId}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setParticipants((prev) => [...prev, payload.new as SpaceBattleParticipant]);
            toast({ title: "New Challenger!", description: "A new player has joined the battle." });
          } else if (payload.eventType === "UPDATE") {
            setParticipants((prev) =>
              prev.map((p) => (p.id === payload.new.id ? (payload.new as SpaceBattleParticipant) : p))
            );
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "space_battle_logs", filter: `battle_id=eq.${battleId}` },
        (payload) => {
          const newLog = payload.new as SpaceBattleLog;
          setLogs((prev) => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
          if (newLog.action_type === 'hit') {
             // Optional: Trigger visual effect here or via state
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(battleSub);
    };
  }, [battleId, toast]);

  const dealDamage = async (damage: number) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;

    // 1. Log the action
    await supabase.from("space_battle_logs").insert({
      battle_id: battleId,
      user_id: user.id,
      action_type: "hit",
      damage: damage,
      message: `Dealt ${damage} damage!`,
    });

    // 2. Update Participant Stats (Optimistic update could be done here too)
    // Note: In a real app, this should be an RPC call to handle concurrency safely
    // For this demo, we'll just update the row directly if RLS allows, or rely on backend triggers
    
    // We'll simulate the RPC call by just updating the battle HP directly for the demo
    // Ideally: await supabase.rpc('deal_damage', { battle_id: battleId, damage_amount: damage });
    
    const newHp = Math.max(0, battle.current_hp - damage);
    await supabase.from("space_battles").update({ current_hp: newHp }).eq("id", battleId);
  };

  return {
    battle,
    participants,
    logs,
    dealDamage,
  };
}
