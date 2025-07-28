"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, CheckCircle, Gamepad2 } from "lucide-react";
import { Challenge, ChallengeCompletion } from "@/types/challenge";
import { showSuccess, showError } from "@/utils/toast";

const fetchActiveChallenges = async (): Promise<Challenge[]> => {
  const { data, error } = await supabase.from("challenges").select("*").eq("is_active", true);
  if (error) throw new Error(error.message);
  return data;
};

const fetchUserCompletions = async (userId: string): Promise<ChallengeCompletion[]> => {
  const { data, error } = await supabase.from("challenge_completions").select("*").eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data;
};

const completeChallenge = async ({ userId, challengeId }: { userId: string; challengeId: string }) => {
  const { error } = await supabase.from("challenge_completions").insert({ user_id: userId, challenge_id: challengeId });
  if (error) throw new Error(error.message);
};

const ChallengesPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: challenges, isLoading: challengesLoading } = useQuery<Challenge[]>({
    queryKey: ["challenges"],
    queryFn: fetchActiveChallenges,
  });

  const { data: completions, isLoading: completionsLoading } = useQuery<ChallengeCompletion[]>({
    queryKey: ["challengeCompletions", user?.id],
    queryFn: () => fetchUserCompletions(user!.id),
    enabled: !!user,
  });

  const completeMutation = useMutation({
    mutationFn: completeChallenge,
    onSuccess: (_, variables) => {
      showSuccess("Challenge completed! Rewards granted.");
      queryClient.invalidateQueries({ queryKey: ["challengeCompletions", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["xpHistory", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["gameLeaderboard"] });
    },
    onError: (err) => showError(err.message),
  });

  const completedChallengeIds = React.useMemo(() => new Set(completions?.map(c => c.challenge_id)), [completions]);

  const availableChallenges = React.useMemo(() => {
    return challenges?.filter(challenge => !completedChallengeIds.has(challenge.id)) || [];
  }, [challenges, completedChallengeIds]);

  const isLoading = challengesLoading || completionsLoading;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Challenges</h1>
      <p className="text-muted-foreground">Complete challenges to earn XP and climb the leaderboard!</p>
      
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : availableChallenges.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableChallenges.map(challenge => (
            <Card key={challenge.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{challenge.title}</CardTitle>
                <CardDescription>{challenge.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-2">
                <div className="font-bold text-vibrant-gold flex items-center">
                  <Trophy className="h-5 w-5 mr-2" /> {challenge.xp_reward} XP
                </div>
                <div className="font-bold text-vibrant-purple flex items-center">
                  <Gamepad2 className="h-5 w-5 mr-2" /> {challenge.game_points_reward} GP
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={() => completeMutation.mutate({ userId: user!.id, challengeId: challenge.id })}
                  disabled={completeMutation.isPending}
                >
                  Complete Challenge
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertTitle>All Done!</AlertTitle>
          <AlertDescription>You've completed all available challenges. Check back later for more!</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ChallengesPage;