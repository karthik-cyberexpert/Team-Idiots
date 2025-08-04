"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Gamepad2, PartyPopper, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TypingText } from "@/types/typing-text";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { showSuccess, showError } from "@/utils/toast";
import { useSearchParams, useNavigate } from "react-router-dom";

const fetchTypingTextById = async (textId: string): Promise<TypingText> => {
  const { data, error } = await supabase
    .from("typing_texts")
    .select("*")
    .eq("id", textId)
    .single();
  if (error) throw new Error(error.message);
  return data;
};

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

const saveGameResult = async ({ userId, textId, wpm, accuracy }: { userId: string; textId: string; wpm: number; accuracy: number; }) => {
  const { data, error } = await supabase.rpc('log_typing_result', {
    p_user_id: userId,
    p_text_id: textId,
    p_wpm: wpm,
    p_accuracy: accuracy,
  });

  if (error) throw error;
  return data;
};

const updateTaskStatus = async (taskId: string) => {
  const { error } = await supabase
    .from("tasks")
    .update({ status: 'waiting_for_approval', completed_at: new Date().toISOString() })
    .eq("id", taskId);
  if (error) throw new Error(error.message);
};

const TyperPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");
  const textId = searchParams.get("textId");

  const { user } = useAuth();
  const [currentText, setCurrentText] = React.useState<TypingText | null>(null);
  const [inputText, setInputText] = React.useState("");
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [endTime, setEndTime] = React.useState<number | null>(null);
  const [accuracy, setAccuracy] = React.useState<number | null>(null);
  const [wpm, setWpm] = React.useState<number | null>(null);
  const [pointsAwarded, setPointsAwarded] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // Fetch specific text if textId is in URL, otherwise fetch all
  const { data: specificText, isLoading: specificTextLoading } = useQuery<TypingText>({
    queryKey: ["typingText", textId],
    queryFn: () => fetchTypingTextById(textId!),
    enabled: !!textId,
  });

  const { data: allTexts, isLoading: textsLoading } = useQuery<TypingText[]>({
    queryKey: ["allTypingTexts"],
    queryFn: fetchAllTypingTexts,
    enabled: !textId, // Only fetch all if not doing a specific challenge
  });

  const { data: completedResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["userGameResults", user?.id],
    queryFn: () => fetchUserGameResults(user!.id),
    enabled: !!user && !textId, // Only fetch results for free play mode
  });

  const updateTaskMutation = useMutation({
    mutationFn: updateTaskStatus,
    onSuccess: () => {
      showSuccess("Daily challenge completed and submitted for approval!");
      queryClient.invalidateQueries({ queryKey: ["userTasks", user?.id] });
    },
    onError: (err: Error) => showError(`Failed to update task: ${err.message}`),
  });

  const saveResultMutation = useMutation({
    mutationFn: saveGameResult,
    onSuccess: (points) => {
      setPointsAwarded(points);
      showSuccess(`You earned ${points} game points!`);
      queryClient.invalidateQueries({ queryKey: ['gameLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['userGameResults', user?.id] });
      if (taskId) {
        updateTaskMutation.mutate(taskId);
      }
    },
    onError: (err: Error) => showError(`Failed to save result: ${err.message}`),
  });

  const resetTest = React.useCallback(() => {
    setStartTime(null);
    setEndTime(null);
    setAccuracy(null);
    setWpm(null);
    setPointsAwarded(null);
    setInputText("");

    if (textId) { // If it's a challenge, stick to the specific text
      if (specificText) setCurrentText(specificText);
    } else if (allTexts) { // Free play mode
      const completedIds = new Set(completedResults?.map(r => r.text_id));
      const playableTexts = allTexts.filter(text => !completedIds.has(text.id));
      
      if (playableTexts.length > 0) {
        const randomIndex = Math.floor(Math.random() * playableTexts.length);
        setCurrentText(playableTexts[randomIndex]);
      } else {
        setCurrentText(null); // All texts completed
      }
    }
    inputRef.current?.focus();
  }, [textId, specificText, allTexts, completedResults]);

  React.useEffect(() => {
    resetTest();
  }, [specificText, allTexts, completedResults, resetTest]);

  const calculateResults = React.useCallback(() => {
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
  }, [startTime, currentText, user, inputText, saveResultMutation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentText || endTime) return;
    const value = e.target.value;
    setInputText(value);
    if (!startTime) setStartTime(Date.now());
    if (value === currentText.content) calculateResults();
  };

  const getCharClass = (char: string, index: number) => {
    if (!currentText) return "";
    if (index < inputText.length) {
      return inputText[index] === char ? "text-vibrant-green" : "text-vibrant-red";
    }
    return "text-muted-foreground";
  };

  const isLoadingData = textsLoading || resultsLoading || specificTextLoading;

  if (isLoadingData) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {taskId && (
          <Button variant="outline" size="icon" onClick={() => navigate('/dashboard/tasks')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">
          {taskId ? "Daily Typing Challenge" : "Typer Free Play"}
        </h1>
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>{currentText ? currentText.title : "All Texts Completed!"}</CardTitle>
          <CardDescription>
            {currentText ? "Type the code below as fast and accurately as you can." : "Great job! Check back later for new texts."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentText ? (
            <>
              <div className="relative p-4 border rounded-md bg-muted/50 text-lg font-mono leading-relaxed whitespace-pre-wrap">
                <div className="absolute inset-0 p-4 text-muted-foreground opacity-50">{currentText.content}</div>
                <div className="relative z-10">
                  {currentText.content.split("").map((char, index) => (
                    <span key={index} className={cn(getCharClass(char, index))}>{char}</span>
                  ))}
                </div>
              </div>
              <Textarea ref={inputRef} value={inputText} onChange={handleInputChange} placeholder="Start typing here..." className="text-lg font-mono" rows={8} disabled={!!endTime} />
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <PartyPopper className="mx-auto h-12 w-12 mb-4 text-vibrant-gold" />
              <p className="text-lg font-semibold">You've mastered all the texts!</p>
              <p>Please ask an admin to add more.</p>
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={resetTest} disabled={!!taskId && !!endTime} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
              <RefreshCw className="mr-2 h-4 w-4" /> {taskId ? "Restart Challenge" : "New Text"}
            </Button>
          </div>
          {endTime && (
            <div className="mt-4 p-4 border rounded-md bg-card flex flex-col sm:flex-row justify-around items-center text-center sm:text-left gap-4">
              <div className="flex items-center gap-2"><CheckCircle className="h-6 w-6 text-vibrant-green" /><div><p className="text-sm text-muted-foreground">Accuracy</p><p className="text-2xl font-bold text-vibrant-green">{accuracy}%</p></div></div>
              <div className="flex items-center gap-2"><XCircle className="h-6 w-6 text-vibrant-orange" /><div><p className="text-sm text-muted-foreground">WPM</p><p className="text-2xl font-bold text-vibrant-orange">{wpm}</p></div></div>
              {pointsAwarded !== null && (<div className="flex items-center gap-2"><Gamepad2 className="h-6 w-6 text-vibrant-purple" /><div><p className="text-sm text-muted-foreground">Points</p><p className="text-2xl font-bold text-vibrant-purple">+{pointsAwarded}</p></div></div>)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TyperPage;