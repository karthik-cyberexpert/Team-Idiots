"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Medal, Award } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  xp: number;
  staged_xp: number;
}

interface LeaderboardItemProps {
  profile: Profile;
  rank: number;
  isCurrentUser: boolean;
  isAdmin: boolean;
  animationState: {
    isAnimating: boolean;
    direction: 'up' | 'down' | 'same';
  } | null;
}

const getInitials = (name: string | null | undefined) => {
  if (!name || name.trim() === '') return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getRankIcon = (rank: number) => {
  if (rank === 1) return <Medal className="h-6 w-6 text-vibrant-gold" />;
  if (rank === 2) return <Medal className="h-6 w-6 text-vibrant-silver" />;
  if (rank === 3) return <Medal className="h-6 w-6 text-vibrant-bronze" />;
  return <Award className="h-5 w-5 text-muted-foreground" />;
};

export const LeaderboardItem = ({ profile, rank, isCurrentUser, isAdmin, animationState }: LeaderboardItemProps) => {
  const totalXp = profile.xp + profile.staged_xp;
  const isAnimatingForThisUser = isCurrentUser && animationState?.isAnimating;

  return (
    <li
      className={cn(
        "flex items-center justify-between p-3 bg-muted/50 rounded-lg shadow-sm transition-all duration-500",
        isCurrentUser && !isAnimatingForThisUser && "ring-2 ring-primary",
        animationState?.isAnimating && !isCurrentUser && "opacity-20",
        isAnimatingForThisUser && "animate-lift shadow-2xl",
        isAnimatingForThisUser && animationState.direction === 'up' && "animate-rank-up",
        isAnimatingForThisUser && animationState.direction === 'down' && "animate-rank-down"
      )}
    >
      <div className="flex items-center gap-4">
        <div className="font-bold text-lg w-8 text-center">{rank}</div>
        {getRankIcon(rank)}
        <Avatar>
          <AvatarImage src="" alt={profile.full_name} />
          <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
        </Avatar>
        <span className="font-medium text-foreground">{profile.full_name}</span>
      </div>
      <div className="font-bold text-primary">
        {totalXp} XP
        {isAdmin && profile.staged_xp > 0 && (
          <span className="text-xs font-normal text-vibrant-green ml-1">(+{profile.staged_xp})</span>
        )}
      </div>
    </li>
  );
};