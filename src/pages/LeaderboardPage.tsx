"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Medal, Award, Check, Undo } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";

interface Profile {
  id: string;
  full_name: string;
  xp: number;
  staged_xp: number;
}

const fetchLeaderboard = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, xp, staged_xp')
    .neq('role', 'admin')
    .limit(100);

  if (error) throw new Error(error.message);
  return data;
};

const publishChanges = async () => {
  const { error } = await supabase.functions.invoke("publish-xp-changes");
  if (error) throw new Error(error.message);
};

const revertChanges = async () => {
  const { error } = await supabase.functions.invoke("revert-xp-changes");
  if (error) throw new Error(error.message);
};

const getInitials = (name: string | null | undefined) => {
  if (!name || name.trim() === '') return '??';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const LeaderboardPage = () => {
  const queryClient = useQueryClient();
  const { user, profile: currentUserProfile } = useAuth();
  const isAdmin = currentUserProfile?.role === 'admin';

  const { data: profiles, isLoading, error } = useQuery<Profile[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  const publishMutation = useMutation({
    mutationFn: publishChanges,
    onSuccess: () => {
      showSuccess("XP changes have been published!");
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const revertMutation = useMutation({
    mutationFn: revertChanges,
    onSuccess: () => {
      showSuccess("Staged XP changes have been reverted.");
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const sortedProfiles = React.useMemo(() => {
    if (!profiles) return [];
    return [...profiles].sort((a, b) => {
      const totalXpA = a.xp + (isAdmin ? a.staged_xp : 0);
      const totalXpB = b.xp + (isAdmin ? b.staged_xp : 0);
      return totalXpB - totalXpA;
    });
  }, [profiles, isAdmin]);

  const hasStagedChanges = React.useMemo(() => {
    return profiles?.some(p => p.staged_xp !== 0);
  }, [profiles]);

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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-purple dark:text-vibrant-pink">XP Leaderboard</h1>
        {isAdmin && hasStagedChanges && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <p className="text-sm font-medium text-muted-foreground">You have unpublished changes.</p>
            <Button size="sm" onClick={() => revertMutation.mutate()} disabled={revertMutation.isPending} variant="outline">
              <Undo className="h-4 w-4 mr-2" /> Revert
            </Button>
            <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
              <Check className="h-4 w-4 mr-2" /> Publish
            </Button>
          </div>
        )}
      </div>
      <Card className="shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
          {isAdmin && <CardDescription>You are viewing the leaderboard with staged changes.</CardDescription>}
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {sortedProfiles.map((profile, index) => {
              const totalXp = profile.xp + (isAdmin ? profile.staged_xp : 0);
              return (
                <li 
                  key={profile.id} 
                  className={cn(
                    "flex items-center justify-between p-3 bg-muted/50 rounded-lg shadow-sm",
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
                  <div className="font-bold text-primary">
                    {totalXp} XP
                    {isAdmin && profile.staged_xp !== 0 && (
                      <span className={cn("ml-2 text-xs", profile.staged_xp > 0 ? "text-vibrant-green" : "text-vibrant-red")}>
                        ({profile.staged_xp > 0 ? '+' : ''}{profile.staged_xp})
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardPage;