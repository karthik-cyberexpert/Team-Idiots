"use client";

import * as React from "react";
import { BossBattle } from "@/types/spacebossbattle";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, Zap, Play } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface BattleLobbyProps {
  battle: BossBattle;
  onJoin: (battleId: string) => void;
  isJoining: boolean;
}

export const BattleLobby = ({ battle, onJoin, isJoining }: BattleLobbyProps) => {
  const isScheduled = battle.status === 'scheduled';
  const isLobby = battle.status === 'lobby';
  const startTime = new Date(battle.start_time);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl text-vibrant-blue">{battle.title}</CardTitle>
        <CardDescription>
          Challenge: {battle.challenge_set.title} ({battle.challenge_set.mode.toUpperCase()})
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" /> <span>Duration: {battle.duration_minutes} mins</span></div>
          <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-muted-foreground" /> <span>Difficulty: {battle.difficulty.toUpperCase()}</span></div>
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> <span>Players: {battle.players.length}/{battle.max_players}</span></div>
          <div className="flex items-center gap-2"><Play className="h-4 w-4 text-muted-foreground" /> <span>Status: {isScheduled ? 'Scheduled' : 'Lobby Open'}</span></div>
        </div>

        <div className="p-3 bg-muted rounded-md">
          <p className="font-semibold">
            {isScheduled ? 'Starts:' : 'Lobby Closes:'}
          </p>
          <p className="text-lg font-bold text-vibrant-green">
            {format(startTime, "PPP p")} ({formatDistanceToNow(startTime, { addSuffix: true })})
          </p>
        </div>

        {(isLobby || (isScheduled && new Date() > startTime)) && (
          <Button 
            className="w-full" 
            onClick={() => onJoin(battle.id)} 
            disabled={isJoining || battle.players.length >= battle.max_players}
          >
            {isJoining ? "Joining..." : "Join Battle"}
          </Button>
        )}
        {isScheduled && new Date() < startTime && (
          <Button className="w-full" disabled>
            Awaiting Start Time
          </Button>
        )}
      </CardContent>
    </Card>
  );
};