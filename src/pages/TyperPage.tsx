"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Gamepad2, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TypingText } from "@/types/typing-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { showSuccess, showError } from "@/utils/toast";

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

const saveGameResult = async ({ userId, textId, wpm, accuracy }: { userId: string; textId: string; wpm: number; accuracy: number }) => {
  const { data, error } = await supabase.rpc('log_typing_result', {
    p_user_id: userId,
    p_text_id: textId,
    p_wpm: wpm,
    p_accuracy: accuracy,
  });

  if (error) throw error;
  return data;
};

const TyperPage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentText, setCurrentText] = React.useState<TypingText | null>(null);
  const [playableTexts, setPlayableTexts] = React.useState<TypingText[]>([]);
  const [inputText, setInputText] = React.useState("");
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [endTime, setEndTime] = React.useState<number | null>(null);
  const [accuracy, setAccuracy] = React.useState<number | null>(null);
  const [wpm, setWpm] = React.useState<number | null>(null);
  const [pointsAwarded, setPointsAwarded] = React.useState<number | null>(null);
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

  React.useEffect(() => {
    if (allTexts && completedResults) {
      const completedIds = new Set(completedResults.map(r => r.text_id));
      const filteredTexts = allTexts.filter(text => !completedIds.has(text.id));
      setPlayableTexts(filteredTexts);
    }
  }, [allTexts, completedResults]);

  const saveResultMutation = useMutation({
    mutationFn: saveGameResult,
    onSuccess: (points) => {
      setPointsAwarded(points);
      showSuccess(`You earned ${points} game points!`);
      queryClient.invalidateQueries({ queryKey: ['gameLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['userGameResults', user?.id] });
    },
    onError: (err: Error) => {
      showError(`Failed to save result: ${err.message}`);
    },
  });

  const resetTest = React.useCallback(() => {
    if (playableTexts.length > 0) {
      const randomIndex = Math.floor(Math.random() * playableTexts.length);
      setCurrentText(playableTexts[randomIndex]);
    } else {
      setCurrentText(null);
    }
    setInputText("");
    setStartTime(null);
    setEndTime(null);
    setAccuracy(null);
    setWpm(null);
    setPointsAwarded(null);
    inputRef.current?.focus();
  }, [playableTexts]);

  React.useEffect(() => {
    resetTest();
  }, [playableTexts, resetTest]);

  const calculateResults = () => {
    if (startTime && currentText && user) {
      const finalTime = Date.now();
      setEndTime(finalTime);
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
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentText || endTime) return;

    const value = e.target.value;
    setInputText(value);

    if (!startTime) {
      setStartTime(Date.now());
    }

    if (value === currentText.content) {
      calculateResults();
    }
  };

  const getCharClass = (char: string, index: number) => {
    if (!currentText) return "";
    if (index < inputText.length) {
      return inputText[index] === char ? "text-vibrant-green" : "text-vibrant-red";
    }
    return "text-muted-foreground";
  };

  const isLoading = textsLoading || (!!user && resultsLoading);
  const error = textsError || resultsError;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Typer</h1>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-10 w-1/4 ml-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Typer</h1>
      <p className="text-muted-foreground">Test and improve your typing speed and accuracy by typing code snippets!</p>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{currentText ? currentText.title : "All Texts Completed!"}</CardTitle>
          <CardDescription>
            {currentText ? "Type the code below as fast and accurately as you can." : "Great job! Check back later for new challenges."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                disabled={!!endTime}
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
            <Button onClick={resetTest} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95" disabled={playableTexts.length <= 1 && !!endTime}>
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