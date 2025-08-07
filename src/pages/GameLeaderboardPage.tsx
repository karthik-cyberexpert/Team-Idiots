"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface GameProfile {
  id: string;
  full_name: string;
  game_points: number;
}

const fetchGameLeaderboard = async (): Promise<GameProfile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, game_points')
    .neq('role', 'admin') // Exclude admins
    .order('game_points', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data;
};

const getInitials = (name: string | null | undefined) => {
  if (!name || name.trim() === '') {
    return '??';
  }
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const GameLeaderboardPage = () => {
  const { user } = useAuth();

  const { data: profiles, isLoading, error } = useQuery<GameProfile[]>({
    queryKey: ["gameLeaderboard"],
    queryFn: fetchGameLeaderboard,
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Medal className="h-6 w-6 text-vibrant-gold" />;
    if (rank === 1) return <Medal className="h-6 w-6 text-vibrant-silver" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-vibrant-bronze" />;
    return <Award className="h-5 w-5 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Game Leaderboard</h1>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Trophy className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-purple dark:text-vibrant-pink">Game Leaderboard</h1>
      
      <Card className="shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle>Top Typer Gamers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {profiles && profiles.map((profile, index) => (
              <li 
                key={profile.id} 
                className={cn(
                  "flex items-center justify-between p-3 bg-muted/50 rounded-lg shadow-md",
                  profile.id === user?.id && "ring-2 ring-primary"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className="font-bold text-lg w-8 text-center">{index + 1}</div>
                  {getRankIcon(index)}
                  <Avatar>
                    <AvatarImage src="" alt={profile.full_name} />
                    <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{profile.full_name}</span>
                </div>
                <div className="font-bold text-primary">{profile.game_points} GP</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameLeaderboardPage;