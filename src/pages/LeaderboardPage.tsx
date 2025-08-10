"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, Send, Undo2 } from "lucide-react"; // Import Undo2 icon
import { cn } from "@/lib/utils";
import { LeaderboardItem } from "@/components/dashboard/LeaderboardItem";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Import AlertDialog components

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
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = React.useState(false); // State for revert confirmation dialog

  const { data: profiles, isLoading, error } = useQuery<Profile[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  React.useEffect(() => {
    const channel = supabase
      .channel('public:profiles:leaderboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  const revertXpMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("reset-staged-xp");
      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess("All staged XP has been reverted!");
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      setIsRevertConfirmOpen(false);
    },
    onError: (err: Error) => {
      showError(err.message);
      setIsRevertConfirmOpen(false);
    },
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
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-purple dark:text-vibrant-pink">XP Leaderboard</h1>
          {isAdmin && (
            <div className="flex gap-2">
              <Button onClick={() => publishXpMutation.mutate()} disabled={publishXpMutation.isPending}>
                <Send className="mr-2 h-4 w-4" />
                {publishXpMutation.isPending ? "Publishing..." : "Publish All Staged XP"}
              </Button>
              <Button variant="outline" onClick={() => setIsRevertConfirmOpen(true)} disabled={revertXpMutation.isPending}>
                <Undo2 className="mr-2 h-4 w-4" />
                {revertXpMutation.isPending ? "Reverting..." : "Revert All Staged XP"}
              </Button>
            </div>
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

      <AlertDialog open={isRevertConfirmOpen} onOpenChange={setIsRevertConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently reset the "Staged XP" for ALL users to zero. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => revertXpMutation.mutate()} disabled={revertXpMutation.isPending}>
              {revertXpMutation.isPending ? "Reverting..." : "Confirm Revert"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LeaderboardPage;