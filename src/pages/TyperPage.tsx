"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Gamepad2, PartyPopper, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TypingText } from "@/types/typing-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { showSuccess, showError } from "@/utils/toast";
import { Challenge } from "@/types/challenge";

const fetchAllTypingTexts = async (): Promise<TypingText[]> => {
  const { data, error } = await supabase
    .from("typing_texts")
    .select("*");
  if (error) throw new Error(error.message);
  return data;
};

const fetchUserGameResults = async (userId: string): Promise<{ text_id: string }[]> => {
  const { data, error } = await supabase
    .from("typing_game_results")
    .select("text_id")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return data;
};

const fetchActiveTyperChallenges = async (): Promise<Challenge[]> => {
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .in("challenge_type", ["typer_goal", "typer_multi_text_timed"])
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return data;
};

const saveGameResult = async ({ userId, textId, wpm, accuracy, challengeId }: { userId: string; textId: string; wpm: number; accuracy: number; challengeId?: string }) => {
  const { data, error } = await supabase.rpc('log_typing_result', {
    p_user_id: userId,
    p_text_id: textId,
    p_wpm: wpm,
    p_accuracy: accuracy,
    p_challenge_id: challengeId || null,
  });

  if (error) throw error;
  return data;
};

const TyperPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentTextIndex, setCurrentTextIndex] = React.useState(0);
  const [currentText, setCurrentText] = React.useState<TypingText | null>(null);
  const [playableTexts, setPlayableTexts] = React.useState<TypingText[]>([]);
  const [inputText, setInputText] = React.useState("");
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [endTime, setEndTime] = React.useState<number | null>(null);
  const [accuracy, setAccuracy] = React.useState<number | null>(null);
  const [wpm, setWpm] = React.useState<number | null>(null);
  const [pointsAwarded, setPointsAwarded] = React.useState<number | null>(null);
  const [activeChallenge, setActiveChallenge] = React.useState<Challenge | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null); // For multi-text timed challenges
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const { data: allTexts, isLoading: textsLoading, error: textsError } = useQuery<TypingText[]>({
    queryKey: ["allTypingTexts"],
    queryFn: fetchAllTypingTexts,
  });

  const { data: completedResults, isLoading: resultsLoading, error: resultsError } = useQuery({
    queryKey: ["userGameResults", user?.id],
    queryFn: () => fetchUserGameResults(user!.id),
    enabled: !!user,
  });

  const { data: activeChallenges, isLoading: challengesLoading } = useQuery<Challenge[]>({
    queryKey: ["activeTyperChallenges"],
    queryFn: fetchActiveTyperChallenges,
  });

  const saveResultMutation = useMutation({
    mutationFn: saveGameResult,
    onSuccess: (points) => {
      setPointsAwarded(points);
      showSuccess(`You earned ${points} game points!`);
      queryClient.invalidateQueries({ queryKey: ['gameLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['userGameResults', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['challengeCompletions', user?.id] }); // Invalidate completions for challenges
    },
    onError: (err: Error) => {
      showError(`Failed to save result: ${err.message}`);
    },
  });

  const startTimer = React.useCallback((duration: number) => {
    setTimeLeft(duration);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime === null || prevTime <= 1) {
          clearInterval(timerRef.current!);
          handleChallengeEnd(true); // Time's up
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  }, []);

  const handleChallengeEnd = React.useCallback((timedOut: boolean = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setEndTime(Date.now()); // Mark end time for results calculation

    if (activeChallenge?.challenge_type === 'typer_multi_text_timed') {
      // For multi-text timed, calculate overall WPM/Accuracy based on all completed texts
      // For simplicity, we'll just mark the challenge as failed if timed out,
      // or calculate based on current progress if all texts were completed before timeout.
      // A more robust solution would track WPM/Accuracy per text and average them.
      if (timedOut) {
        showError("Time's up! Challenge failed.");
        // Optionally log a failed attempt or just reset
      } else {
        // All texts completed before timer ran out
        calculateResults();
      }
    } else {
      calculateResults();
    }
  }, [activeChallenge, calculateResults]); // Add calculateResults to dependencies

  const resetTest = React.useCallback((challenge?: Challenge) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStartTime(null);
    setEndTime(null);
    setAccuracy(null);
    setWpm(null);
    setPointsAwarded(null);
    setInputText("");
    setCurrentTextIndex(0);
    setTimeLeft(null);

    if (challenge && challenge.challenge_type === 'typer_multi_text_timed' && challenge.typing_text_ids) {
      // Fetch the actual text content for the IDs
      const textsForChallenge = allTexts?.filter(text => challenge.typing_text_ids?.includes(text.id)) || [];
      setPlayableTexts(textsForChallenge);
      setCurrentText(textsForChallenge[0] || null);
      if (challenge.time_limit_seconds) {
        startTimer(challenge.time_limit_seconds);
      }
    } else if (challenge && challenge.challenge_type === 'typer_goal' && challenge.typing_text_id) {
      const textForChallenge = allTexts?.find(text => text.id === challenge.typing_text_id) || null;
      setPlayableTexts(textForChallenge ? [textForChallenge] : []);
      setCurrentText(textForChallenge);
    } else {
      // Standard random text selection, excluding texts linked to typer_goal challenges
      const textsNotLinkedToTyperGoals = allTexts?.filter(text => 
        !activeChallenges?.some(c => c.challenge_type === 'typer_goal' && c.typing_text_id === text.id)
      ) || [];
      
      const completedIds = new Set(completedResults?.map(r => r.text_id));
      const filteredTexts = textsNotLinkedToTyperGoals.filter(text => !completedIds.has(text.id));
      setPlayableTexts(filteredTexts);
      setCurrentText(filteredTexts[0] || null); // Start with the first available text
    }
    inputRef.current?.focus();
  }, [allTexts, activeChallenges, completedResults, startTimer]);

  React.useEffect(() => {
    if (allTexts && completedResults && activeChallenges) {
      // Prioritize multi-text timed challenges if available and not completed
      const multiTextChallenge = activeChallenges.find(c => c.challenge_type === 'typer_multi_text_timed' && !completedResults.some(cr => cr.text_id === c.id)); // Assuming challenge ID is used for completion
      if (multiTextChallenge) {
        setActiveChallenge(multiTextChallenge);
        resetTest(multiTextChallenge);
        return;
      }

      // Then prioritize single typer goal challenges
      const singleTyperChallenge = activeChallenges.find(c => c.challenge_type === 'typer_goal' && !completedResults.some(cr => cr.text_id === c.id));
      if (singleTyperChallenge) {
        setActiveChallenge(singleTyperChallenge);
        resetTest(singleTyperChallenge);
        return;
      }

      // Fallback to random texts if no active challenges
      setActiveChallenge(null);
      resetTest();
    }
  }, [allTexts, completedResults, activeChallenges, resetTest]);

  const calculateResults = React.useCallback(() => {
    if (startTime && currentText && user) {
      const finalTime = endTime || Date.now();
      const durationInMinutes = (finalTime - startTime) / 60000;
      const wordsTyped = currentText.content.split(" ").length;
      const calculatedWpm = Math.round(wordsTyped / durationInMinutes);
      setWpm(calculatedWpm);

      let correctChars = 0;
      for (let i = 0; i < inputText.length; i++) {
        if (inputText[i] === currentText.content[i]) {
          correctChars++;
        }
      }
      const calculatedAccuracy = (correctChars / currentText.content.length) * 100;
      const finalAccuracy = parseFloat(calculatedAccuracy.toFixed(2));
      setAccuracy(finalAccuracy);

      saveResultMutation.mutate({
        userId: user.id,
        textId: currentText.id,
        wpm: calculatedWpm,
        accuracy: finalAccuracy,
        challengeId: activeChallenge?.id, // Pass challenge ID if applicable
      });
    }
  }, [startTime, currentText, user, inputText, endTime, activeChallenge, saveResultMutation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentText || endTime) return;

    const value = e.target.value;
    setInputText(value);

    if (!startTime) {
      setStartTime(Date.now());
    }

    if (value === currentText.content) {
      if (activeChallenge?.challenge_type === 'typer_multi_text_timed') {
        // Move to next text or end challenge
        if (currentTextIndex < playableTexts.length - 1) {
          setCurrentTextIndex(prevIndex => prevIndex + 1);
          setCurrentText(playableTexts[currentTextIndex + 1]);
          setInputText(""); // Clear input for next text
        } else {
          // All texts completed
          handleChallengeEnd(false); // Not timed out
        }
      } else {
        calculateResults();
      }
    }
  };

  const getCharClass = (char: string, index: number) => {
    if (!currentText) return "";
    if (index < inputText.length) {
      return inputText[index] === char ? "text-vibrant-green" : "text-vibrant-red";
    }
    return "text-muted-foreground";
  };

  const isLoadingData = textsLoading || resultsLoading || challengesLoading;
  const errorData = textsError || resultsError;

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoadingData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Typer</h1>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-1/4 ml-auto" />
      </div>
    );
  }

  if (errorData) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{errorData.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Typer</h1>
      <p className="text-muted-foreground">Test and improve your typing speed and accuracy by typing code snippets!</p>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{activeChallenge ? activeChallenge.title : (currentText ? currentText.title : "All Texts Completed!")}</CardTitle>
          <CardDescription>
            {activeChallenge?.challenge_type === 'typer_multi_text_timed' ? (
              `Complete ${playableTexts.length} texts within ${formatTime(activeChallenge.time_limit_seconds)}.`
            ) : currentText ? "Type the code below as fast and accurately as you can." : "Great job! Check back later for new challenges."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {activeChallenge?.challenge_type === 'typer_multi_text_timed' && timeLeft !== null && (
            <div className="flex items-center justify-center text-2xl font-bold text-vibrant-red">
              <Timer className="h-6 w-6 mr-2" /> Time Left: {formatTime(timeLeft)}
            </div>
          )}
          {currentText ? (
            <>
              <div className="relative p-4 border rounded-md bg-muted/50 text-lg font-mono leading-relaxed whitespace-pre-wrap">
                <div className="absolute inset-0 p-4 text-muted-foreground opacity-50">
                  {currentText.content}
                </div>
                <div className="relative z-10">
                  {currentText.content.split("").map((char, index) => (
                    <span key={index} className={cn(getCharClass(char, index))}>
                      {char}
                    </span>
                  ))}
                </div>
              </div>
              <Textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                placeholder="Start typing here..."
                className="text-lg font-mono"
                rows={8}
                disabled={!!endTime || (activeChallenge?.challenge_type === 'typer_multi_text_timed' && timeLeft === 0)}
              />
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <PartyPopper className="mx-auto h-12 w-12 mb-4 text-vibrant-gold" />
              <p className="text-lg font-semibold">You've mastered all the texts!</p>
              <p>Please ask an admin to add more challenges.</p>
            </div>
          )}
          
          <div className="flex justify-end">
            <Button onClick={() => resetTest(activeChallenge || undefined)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95" disabled={playableTexts.length <= 1 && !!endTime}>
              <RefreshCw className="mr-2 h-4 w-4" /> New Text
            </Button>
          </div>

          {endTime && (
            <div className="mt-4 p-4 border rounded-md bg-card flex flex-col sm:flex-row justify-around items-center text-center sm:text-left gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-vibrant-green" />
                <div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-bold text-vibrant-green">{accuracy}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-vibrant-orange" />
                <div>
                  <p className="text-sm text-muted-foreground">WPM</p>
                  <p className="text-2xl font-bold text-vibrant-orange">{wpm}</p>
                </div>
              </div>
              {pointsAwarded !== null && (
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-6 w-6 text-vibrant-purple" />
                  <div>
                    <p className="text-sm text-muted-foreground">Points</p>
                    <p className="text-2xl font-bold text-vibrant-purple">+{pointsAwarded}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TyperPage;