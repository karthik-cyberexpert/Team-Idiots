"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { LeaderboardItem } from "@/components/dashboard/LeaderboardItem";
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

const LeaderboardPage = () => {
  const queryClient = useQueryClient();
  const { user, profile: currentUserProfile } = useAuth();
  const isAdmin = currentUserProfile?.role === 'admin';

  const { data: profiles, isLoading, error } = useQuery<Profile[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  const sortedProfiles = React.useMemo(() => {
    if (!profiles) return [];
    return [...profiles].sort((a, b) => (b.xp + b.staged_xp) - (a.xp + a.staged_xp));
  }, [profiles]);

  const publishXpMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("publish-all-xp");
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("All staged XP has been published!");
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
    },
    onError: (err: Error) => showError(err.message),
  });

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
        {isAdmin && (
          <Button onClick={() => publishXpMutation.mutate()} disabled={publishXpMutation.isPending}>
            <Send className="mr-2 h-4 w-4" />
            {publishXpMutation.isPending ? "Publishing..." : "Publish All Staged XP"}
          </Button>
        )}
      </div>
      <Card className="shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle>Top Performers</CardTitle>
          {isAdmin && <CardDescription>Admin view: Staged XP is shown in parentheses.</CardDescription>}
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
                animationState={null} // Animation logic removed for simplicity of this refactor
              />
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeaderboardPage;