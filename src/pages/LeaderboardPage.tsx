"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Profile {
  id: string;
  full_name: string;
  xp: number;
}

const fetchLeaderboard = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, xp')
    .order('xp', { ascending: false })
    .limit(100);

  if (error) throw new Error(error.message);
  return data;
};

const getInitials = (name: string | null | undefined) => {
  if (!name || name.trim() === '') {
    return '??'; // Default for null, undefined, or empty string
  }
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const LeaderboardPage = () => {
  const queryClient = useQueryClient();
  const { data: profiles, isLoading, error } = useQuery<Profile[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  // Real-time subscription for leaderboard updates
  React.useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Medal className="h-6 w-6 text-vibrant-gold" />;
    if (rank === 1) return <Medal className="h-6 w-6 text-vibrant-silver" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-vibrant-bronze" />;
    return <Award className="h-5 w-5 text-muted-foreground" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Leaderboard</h1>
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
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-purple dark:text-vibrant-pink">Leaderboard</h1>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {profiles && profiles.map((profile, index) => (
              <li key={profile.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group transform transition-transform-shadow duration-300 ease-in-out hover:scale-[1.02] hover:shadow-xl hover:rotate-x-1 hover:rotate-y-1 shadow-md">
                <div className="flex items-center gap-4">
                  <div className="font-bold text-lg w-8 text-center">{index + 1}</div>
                  {getRankIcon(index)}
                  <Avatar>
                    <AvatarImage src="" alt={profile.full_name} />
                    <AvatarFallback>{getInitials(profile.full_name)}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{profile.full_name}</span>
                </div>
                <div className="font-bold text-primary">{profile.xp} XP</div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardPage;