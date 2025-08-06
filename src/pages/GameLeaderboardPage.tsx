"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Medal, Award, Info } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { GameCountdown } from "@/components/game/GameCountdown";
import { TyperSet } from "@/types/typer";
import { format } from "date-fns";

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

const fetchActiveTyperSet = async (): Promise<TyperSet | null> => {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // A set is considered active if it was assigned in the last 7 days.
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('typer_sets')
    .select('*')
    .eq('status', 'published')
    .gte('assign_date', sevenDaysAgoStr) // Must be assigned in the last 7 days
    .lte('assign_date', todayStr)      // And not in the future
    .order('assign_date', { ascending: false }) // Get the most recent one
    .limit(1)
    .single();
  
  if (error && error.code !== 'PGRST116') { // Ignore 'No rows found' error
    throw new Error(error.message);
  }
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
  const queryClient = useQueryClient();
  const { user, profile: currentUserProfile } = useAuth();
  const isAdmin = currentUserProfile?.role === 'admin';
  const [showCountdown, setShowCountdown] = React.useState(false);
  const [publishTime, setPublishTime] = React.useState<Date | null>(null);
  const [debugInfo, setDebugInfo] = React.useState<any>(null);

  const { data: profiles, isLoading: profilesLoading, error: profilesError } = useQuery<GameProfile[]>({
    queryKey: ["gameLeaderboard"],
    queryFn: fetchGameLeaderboard,
  });

  const { data: activeSet, isLoading: setisLoading } = useQuery<TyperSet | null>({
    queryKey: ["activeTyperSet"],
    queryFn: fetchActiveTyperSet,
  });

  React.useEffect(() => {
    if (!activeSet || !activeSet.end_time) {
      if (isAdmin) {
        setDebugInfo({
          currentTime: format(new Date(), "HH:mm:ss"),
          activeSet: activeSet?.title || "None",
          endTime: "Not set",
          publishTime: "N/A",
          countdownActive: "No",
          reason: "No currently active set found, or the set has no end time."
        });
      }
      return;
    }

    const checkTime = () => {
      const now = new Date();
      const [endH, endM] = activeSet.end_time!.split(':').map(Number);
      
      const endTimeToday = new Date();
      endTimeToday.setHours(endH, endM, 0, 0);

      const publishTimeToday = new Date(endTimeToday.getTime() + 5 * 60 * 1000);

      if (now > endTimeToday && now < publishTimeToday) {
        setShowCountdown(true);
        setPublishTime(publishTimeToday);
      } else {
        setShowCountdown(false);
        setPublishTime(null);
      }

      if (isAdmin) {
        setDebugInfo({
          currentTime: format(now, "HH:mm:ss"),
          activeSet: activeSet.title,
          endTime: format(endTimeToday, "HH:mm:ss"),
          publishTime: format(publishTimeToday, "HH:mm:ss"),
          countdownActive: (now > endTimeToday && now < publishTimeToday) ? "Yes" : "No",
          reason: (now > endTimeToday && now < publishTimeToday) ? "" : "Current time is outside the 5-minute countdown window."
        });
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, [activeSet, isAdmin]);

  const handleCountdownEnd = () => {
    setShowCountdown(false);
    queryClient.invalidateQueries({ queryKey: ["gameLeaderboard"] });
  };

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Medal className="h-6 w-6 text-vibrant-gold" />;
    if (rank === 1) return <Medal className="h-6 w-6 text-vibrant-silver" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-vibrant-bronze" />;
    return <Award className="h-5 w-5 text-muted-foreground" />;
  };

  if (profilesLoading || setisLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Game Leaderboard</h1>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (profilesError) {
    return (
      <Alert variant="destructive">
        <Trophy className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{profilesError.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-purple dark:text-vibrant-pink">Game Leaderboard</h1>
      
      {isAdmin && debugInfo && (
        <Card className="bg-yellow-50 border border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800/50">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <CardTitle className="text-yellow-800 dark:text-yellow-300">Admin Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
            <p><strong>Current Time:</strong> {debugInfo.currentTime}</p>
            <p><strong>Active Set:</strong> {debugInfo.activeSet}</p>
            <p><strong>Set End Time:</strong> {debugInfo.endTime}</p>
            <p><strong>Publish Time:</strong> {debugInfo.publishTime}</p>
            <p><strong>Countdown Active:</strong> {debugInfo.countdownActive}</p>
            <p><strong>Reason:</strong> {debugInfo.reason}</p>
          </CardContent>
        </Card>
      )}

      {showCountdown && publishTime ? (
        <Card className="shadow-md overflow-hidden">
          <CardHeader>
            <CardTitle>Leaderboard Update in Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <GameCountdown publishTime={publishTime} onEnd={handleCountdownEnd} />
          </CardContent>
        </Card>
      ) : (
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
      )}
    </div>
  );
};

export default GameLeaderboardPage;