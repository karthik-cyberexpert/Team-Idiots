"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Check, Undo } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { LeaderboardItem } from "@/components/dashboard/LeaderboardItem";

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

// Placeholder for sound effects - you can replace these with your own audio files
const playSound = (sound: 'up' | 'down') => {
  console.log(`Playing sound: ${sound}`);
  // Example implementation:
  // const audio = new Audio(`/sounds/${sound}.mp3`);
  // audio.play().catch(e => console.error("Error playing sound:", e));
};

const LeaderboardPage = () => {
  const queryClient = useQueryClient();
  const { user, profile: currentUserProfile } = useAuth();
  const isAdmin = currentUserProfile?.role === 'admin';
  const [animationState, setAnimationState] = React.useState<{ isAnimating: boolean; direction: 'up' | 'down' | 'same' } | null>(null);

  const { data: profiles, isLoading, error } = useQuery<Profile[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  const sortedProfiles = React.useMemo(() => {
    if (!profiles) return [];
    return [...profiles].sort((a, b) => {
      const totalXpA = a.xp + (isAdmin ? a.staged_xp : 0);
      const totalXpB = b.xp + (isAdmin ? b.staged_xp : 0);
      return totalXpB - totalXpA;
    });
  }, [profiles, isAdmin]);

  React.useEffect(() => {
    if (!sortedProfiles.length || !user || isAdmin) return;

    const lastPublishedKey = 'lastPublishedTimestamp';
    const userRankKey = `userRank_${user.id}`;

    const lastPublishedTimestamp = queryClient.getQueryState(['leaderboard'])?.dataUpdatedAt;
    const lastSeenTimestamp = localStorage.getItem(lastPublishedKey);

    if (lastPublishedTimestamp && lastPublishedTimestamp.toString() !== lastSeenTimestamp) {
      const currentRank = sortedProfiles.findIndex(p => p.id === user.id) + 1;
      const lastKnownRankStr = localStorage.getItem(userRankKey);
      const lastKnownRank = lastKnownRankStr ? parseInt(lastKnownRankStr, 10) : null;

      if (currentRank > 0 && lastKnownRank && currentRank !== lastKnownRank) {
        const direction = currentRank < lastKnownRank ? 'up' : 'down';
        setAnimationState({ isAnimating: true, direction });
        playSound(direction);

        setTimeout(() => {
          setAnimationState(null);
        }, 4000); // Animation duration
      }

      localStorage.setItem(userRankKey, currentRank.toString());
      localStorage.setItem(lastPublishedKey, lastPublishedTimestamp.toString());
    } else if (!lastSeenTimestamp && lastPublishedTimestamp) {
      // First time viewing, just store the rank
      const currentRank = sortedProfiles.findIndex(p => p.id === user.id) + 1;
      if (currentRank > 0) {
        localStorage.setItem(userRankKey, currentRank.toString());
      }
      localStorage.setItem(lastPublishedKey, lastPublishedTimestamp.toString());
    }
  }, [sortedProfiles, user, isAdmin, queryClient]);

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

  const hasStagedChanges = React.useMemo(() => {
    return profiles?.some(p => p.staged_xp !== 0);
  }, [profiles]);

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
    <div className="relative">
      {animationState?.isAnimating && (
        <div className={cn(
          "fixed inset-0 z-50 pointer-events-none animate-fade-in-out",
          animationState.direction === 'up' && "bg-glow-green",
          animationState.direction === 'down' && "bg-glow-red"
        )} />
      )}
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
            <ul className="space-y-3 relative z-10">
              {sortedProfiles.map((profile, index) => (
                <LeaderboardItem
                  key={profile.id}
                  profile={profile}
                  rank={index + 1}
                  isCurrentUser={profile.id === user?.id}
                  isAdmin={isAdmin}
                  animationState={animationState}
                />
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LeaderboardPage;