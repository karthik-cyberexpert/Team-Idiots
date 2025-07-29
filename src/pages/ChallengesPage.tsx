"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trophy, CheckCircle, Gamepad2, ListTodo, Type, Timer } from "lucide-react";
import { Challenge, ChallengeCompletion } from "@/types/challenge";
import { showSuccess, showError } from "@/utils/toast";
import { Link } from "react-router-dom";

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

const completeManualChallenge = async ({ userId, challengeId }: { userId: string; challengeId: string }) => {
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
    mutationFn: completeManualChallenge,
    onSuccess: () => {
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

  const getChallengeGoal = (challenge: Challenge) => {
    switch (challenge.challenge_type) {
      case 'task_completion':
        return <div className="text-sm text-muted-foreground flex items-center"><ListTodo className="h-4 w-4 mr-2" />Complete the assigned task.</div>;
      case 'typer_goal':
        return <div className="text-sm text-muted-foreground flex items-center"><Type className="h-4 w-4 mr-2" />Achieve {challenge.typer_wpm_goal} WPM with {challenge.typer_accuracy_goal || 90}% accuracy.</div>;
      case 'typer_multi_text_timed':
        return (
          <div className="text-sm text-muted-foreground flex items-center">
            <Type className="h-4 w-4 mr-2" />
            <Timer className="h-4 w-4 mr-1" />
            Complete {challenge.typing_text_ids?.length || 0} typing texts within {challenge.time_limit_seconds ? `${Math.floor(challenge.time_limit_seconds / 60)}:${(challenge.time_limit_seconds % 60).toString().padStart(2, '0')}` : 'N/A'} minutes.
          </div>
        );
      default:
        return <div className="text-sm text-muted-foreground">Manually complete this challenge.</div>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Challenges</h1>
      <p className="text-muted-foreground">Complete challenges to earn XP and climb the leaderboard!</p>
      
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-52 w-full" />
        </div>
      ) : availableChallenges.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableChallenges.map(challenge => (
            <Card key={challenge.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{challenge.title}</CardTitle>
                <CardDescription>{challenge.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow space-y-3">
                <div>{getChallengeGoal(challenge)}</div>
                <div className="font-bold text-vibrant-gold flex items-center">
                  <Trophy className="h-5 w-5 mr-2" /> {challenge.xp_reward} XP
                </div>
                <div className="font-bold text-vibrant-purple flex items-center">
                  <Gamepad2 className="h-5 w-5 mr-2" /> {challenge.game_points_reward} GP
                </div>
              </CardContent>
              {challenge.challenge_type === 'manual' && (
                <CardFooter>
                  <Button 
                    className="w-full" 
                    onClick={() => completeMutation.mutate({ userId: user!.id, challengeId: challenge.id })}
                    disabled={completeMutation.isPending}
                  >
                    Complete Challenge
                  </Button>
                </CardFooter>
              )}
              {(challenge.challenge_type === 'typer_goal' || challenge.challenge_type === 'typer_multi_text_timed') && (
                <CardFooter>
                  <Link to="/dashboard/typer" className="w-full">
                    <Button className="w-full">Go to Typer Game</Button>
                  </Link>
                </CardFooter>
              )}
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