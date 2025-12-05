"use client";

import * as React from "react";
import { BossBattle } from "@/types/spacebossbattle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Heart, Users, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface BattleArenaProps {
  battle: BossBattle;
}

export const BattleArena = ({ battle }: BattleArenaProps) => {
  const bossHpPercentage = (battle.game_state.boss_hp / battle.base_hp) * 100;

  return (
    <div className="space-y-4">
      <Card className="bg-background border-vibrant-purple shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-2xl text-vibrant-pink">{battle.title}</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center text-vibrant-green">
              <Heart className="h-5 w-5 mr-1" />
              <span className="font-bold">{battle.game_state.boss_hp} / {battle.base_hp} HP</span>
            </div>
            <div className="flex items-center text-vibrant-blue">
              <Users className="h-5 w-5 mr-1" />
              <span>{battle.players.length} Players</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={bossHpPercentage} className="h-4" indicatorClassName="bg-vibrant-red" />
          
          {/* Placeholder for the Visual Arena */}
          <div className="relative w-full h-96 bg-black rounded-lg border border-vibrant-purple flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: "url('/placeholder.svg')" }}></div>
            <div className="text-center z-10">
              <h3 className="text-4xl font-bold text-white animate-pulse">SPACE ARENA VISUALS</h3>
              <p className="text-vibrant-yellow mt-2">Ships orbiting Boss, Laser Animations, Real-time HP Bar</p>
            </div>
          </div>

          {/* Damage Scoreboard and Battle Feed */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="md:col-span-2">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Battle Feed</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-32 pr-4 text-sm">
                  {battle.game_state.battle_feed.slice().reverse().map((entry, index) => (
                    <p key={index} className="text-muted-foreground">{entry.timestamp}: {entry.message}</p>
                  ))}
                  <p className="text-vibrant-green">00:00:00: Battle started!</p>
                </ScrollArea>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Zap className="h-4 w-4" /> Scoreboard</CardTitle></CardHeader>
              <CardContent>
                <ScrollArea className="h-32 pr-4 text-sm">
                  {battle.players.sort((a, b) => b.damage_dealt - a.damage_dealt).map((player, index) => (
                    <div key={player.user_id} className="flex justify-between">
                      <span>{index + 1}. {player.full_name}</span>
                      <span className="font-semibold text-vibrant-red">{player.damage_dealt} DMG</span>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};