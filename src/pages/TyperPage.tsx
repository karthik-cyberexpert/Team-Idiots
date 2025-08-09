"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, XCircle, Gamepad2, PartyPopper, ArrowLeft, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TypingTextWithSet } from "@/types/typer";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthProvider";
import { showSuccess, showError } from "@/utils/toast";
import { useSearchParams, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ChallengeTimer } from "@/components/game/ChallengeTimer";

const fetchTypingTextWithSet = async (textId: string): Promise<TypingTextWithSet> => {
  const { data, error } = await supabase
    .from("typing_texts")
    .select("*, typer_sets(*)")
    .eq("id", textId)
    .single();
  if (error) throw new Error(error.message);
  
  // Check if the set is inactive
  if (data.typer_sets && data.typer_sets.status === 'inactive') {
    throw new Error('This typing challenge is no longer active');
  }
  
  return data as TypingTextWithSet;
};

const fetchAllTypingTexts = async (): Promise<TypingTextWithSet[]> => {
  const { data, error } = await supabase
    .from("typing_texts")
    .select("*, typer_sets!inner(*)")
    .neq('typer_sets.status', 'inactive'); // Filter out inactive sets using inner join
  if (error) throw new Error(error.message);
  
  return data as TypingTextWithSet[];
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
    p_challenge_id: null, // Explicitly set to null for the 5-parameter version
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

// Helper to normalize different types of quotes into standard ones
const normalizeText = (text: string) => {
  if (!text) return "";
  return text
    .replace(/[\u2018\u2019]/g, "'") // Converts curly single quotes to straight
    .replace(/[\u201C\u201D]/g, '"'); // Converts curly double quotes to straight
};

const Countdown = ({ targetDate, onEnd }: { targetDate: Date, onEnd: () => void }) => {
  const [remaining, setRemaining] = React.useState("00:00:00");

  React.useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      if (now >= targetDate) {
        setRemaining("00:00:00");
        onEnd();
        return;
      }
      
      const totalSeconds = Math.floor((targetDate.getTime() - now.getTime()) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setRemaining(formattedTime);
    };

    // Update immediately
    updateCountdown();
    
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onEnd]);

  return (
    <div className="text-center py-10 text-muted-foreground">
      <Timer className="mx-auto h-12 w-12 mb-4 text-vibrant-blue" />
      <p className="text-lg font-semibold">Next challenge starts in:</p>
      <p className="text-4xl font-bold text-primary font-mono">{remaining}</p>
    </div>
  );
};

const TyperPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const taskId = searchParams.get("taskId");
  const textId = searchParams.get("textId");

  const { user } = useAuth();
  const [currentText, setCurrentText] = React.useState<TypingTextWithSet | null>(null);
  const [inputText, setInputText] = React.useState("");
  const [startTime, setStartTime] = React.useState<number | null>(null);
  const [endTime, setEndTime] = React.useState<number | null>(null);
  const [accuracy, setAccuracy] = React.useState<number | null>(null);
  const [wpm, setWpm] = React.useState<number | null>(null);
  const [pointsAwarded, setPointsAwarded] = React.useState<number | null>(null);
  const [timeState, setTimeState] = React.useState<'PENDING' | 'ACTIVE' | 'EXPIRED'>('PENDING');
  const [nextStartTime, setNextStartTime] = React.useState<Date | null>(null);
  const [challengeStartTime, setChallengeStartTime] = React.useState<Date | null>(null);
  const [challengeEndTime, setChallengeEndTime] = React.useState<Date | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const { data: challengeText, isLoading: challengeTextLoading, error: challengeTextError } = useQuery<TypingTextWithSet>({
    queryKey: ["typingText", textId],
    queryFn: () => fetchTypingTextWithSet(textId!),
    enabled: !!textId,
    retry: false, // Don't retry if the challenge is inactive
  });

  const { data: allTexts, isLoading: textsLoading } = useQuery<TypingTextWithSet[]>({
    queryKey: ["allTypingTexts"],
    queryFn: fetchAllTypingTexts,
    enabled: !textId,
    staleTime: 0, // Always consider data stale to refetch
    refetchOnWindowFocus: true,
  });

  const { data: completedResults, isLoading: resultsLoading } = useQuery({
    queryKey: ["userGameResults", user?.id],
    queryFn: () => fetchUserGameResults(user!.id),
    enabled: !!user && !textId,
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
      } else {
        // Auto-switch to next text after 3 seconds for free play
        setTimeout(() => {
          resetTest();
        }, 3000);
      }
    },
    onError: (err: Error) => showError(`Failed to save result: ${err.message}`),
  });

  const calculateResults = React.useCallback((finalInputText: string) => {
    if (startTime && currentText && user) {
      const finalTime = Date.now();
      setEndTime(finalTime);
      const durationInMinutes = (finalTime - startTime) / 60000;
      
      const normalizedOriginal = normalizeText(currentText.content);
      const originalTextPortion = normalizedOriginal.substring(0, finalInputText.length);
      let correctChars = 0;
      for (let i = 0; i < finalInputText.length; i++) {
        if (finalInputText[i] === originalTextPortion[i]) {
          correctChars++;
        }
      }
      
      const calculatedAccuracy = finalInputText.length > 0 ? (correctChars / finalInputText.length) * 100 : 0;
      const finalAccuracy = parseFloat(calculatedAccuracy.toFixed(2));
      setAccuracy(finalAccuracy);

      const wordsTyped = finalInputText.trim().split(/\s+/).filter(Boolean).length;
      const calculatedWpm = durationInMinutes > 0 ? Math.round(wordsTyped / durationInMinutes) : 0;
      setWpm(calculatedWpm);

      saveResultMutation.mutate({
        userId: user.id,
        textId: currentText.id,
        wpm: calculatedWpm,
        accuracy: finalAccuracy,
      });
    }
  }, [startTime, currentText, user, saveResultMutation]);

  const resetTest = React.useCallback(() => {
    setStartTime(null);
    setEndTime(null);
    setAccuracy(null);
    setWpm(null);
    setPointsAwarded(null);
    setInputText("");

    if (textId) {
      if (challengeText) setCurrentText(challengeText);
    } else if (allTexts) {
      const completedIds = new Set(completedResults?.map(r => r.text_id));
      const playableTexts = allTexts.filter(text => !completedIds.has(text.id));
      
      if (playableTexts.length > 0) {
        // Random selection from unplayed texts
        const randomIndex = Math.floor(Math.random() * playableTexts.length);
        setCurrentText(playableTexts[randomIndex]);
      } else {
        // All texts completed - show message or start over
        setCurrentText(null);
      }
    }
    inputRef.current?.focus();
  }, [textId, challengeText, allTexts, completedResults]);

  React.useEffect(() => {
    resetTest();
  }, [challengeText, allTexts, completedResults, resetTest]);

  // Effect to manage the time state of the challenge
  React.useEffect(() => {
    if (!currentText) return;
    const set = currentText.typer_sets;
    if (!set || !set.start_time || !set.end_time) {
      setTimeState('ACTIVE');
      setChallengeStartTime(null);
      setChallengeEndTime(null);
      return;
    }

    const checkTimeState = () => {
      const now = new Date();
      const [startH, startM] = set.start_time!.split(':').map(Number);
      const [endH, endM] = set.end_time!.split(':').map(Number);

      const startTimeToday = new Date();
      startTimeToday.setHours(startH, startM, 0, 0);
      const endTimeToday = new Date();
      endTimeToday.setHours(endH, endM, 0, 0);

      if (now < startTimeToday) {
        setTimeState('PENDING');
        setNextStartTime(startTimeToday);
        setChallengeStartTime(null);
        setChallengeEndTime(null);
      } else if (now > endTimeToday) {
        setTimeState('EXPIRED');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(startH, startM, 0, 0);
        setNextStartTime(tomorrow);
        setChallengeStartTime(null);
        setChallengeEndTime(null);
      } else {
        setTimeState('ACTIVE');
        setChallengeStartTime(startTimeToday);
        setChallengeEndTime(endTimeToday);
        setNextStartTime(null);
      }
    };

    // Check immediately when component loads
    checkTimeState();
    
    const interval = setInterval(checkTimeState, 1000);
    return () => clearInterval(interval);
  }, [currentText]);

  // Effect to auto-submit when the time expires
  React.useEffect(() => {
    if (timeState === 'EXPIRED' && startTime && !endTime) {
      calculateResults(inputText);
    }
  }, [timeState, startTime, endTime, inputText, calculateResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!currentText || endTime || timeState !== 'ACTIVE') return;
    const value = normalizeText(e.target.value);
    setInputText(value);
    if (!startTime) setStartTime(Date.now());
    if (value.length >= normalizeText(currentText.content).length) {
      calculateResults(value);
    }
  };

  const normalizedContent = React.useMemo(() => {
    return currentText ? normalizeText(currentText.content) : "";
  }, [currentText]);

  const getCharClass = (char: string, index: number) => {
    if (index >= inputText.length) return "text-muted-foreground";
    return inputText[index] === char ? "text-vibrant-green" : "text-vibrant-red";
  };

  const isLoadingData = textsLoading || resultsLoading || challengeTextLoading;

  if (isLoadingData) {
    return <Skeleton className="h-64 w-full" />;
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
        {/* Only show header when challenge is active or completed */}
        {timeState === 'ACTIVE' || endTime ? (
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{currentText ? currentText.title : "All Texts Completed!"}</CardTitle>
                <CardDescription>
                  {currentText ? "Type the text below as fast and accurately as you can." : "Great job! Check back later for new texts."}
                </CardDescription>
              </div>
              {timeState === 'ACTIVE' && challengeStartTime && challengeEndTime && (
                <ChallengeTimer startTime={challengeStartTime} endTime={challengeEndTime} />
              )}
            </div>
          </CardHeader>
        ) : null}
        
        <CardContent className="space-y-4">
          {challengeTextError ? (
            <div className="text-center py-10 text-muted-foreground">
              <XCircle className="mx-auto h-12 w-12 mb-4 text-vibrant-red" />
              <p className="text-lg font-semibold">Challenge No Longer Available</p>
              <p>{challengeTextError.message}</p>
              {taskId && (
                <Button 
                  className="mt-4" 
                  onClick={() => navigate('/dashboard/tasks')}
                >
                  Return to Tasks
                </Button>
              )}
            </div>
          ) : timeState !== 'ACTIVE' && nextStartTime ? (
            <Countdown targetDate={nextStartTime} onEnd={resetTest} />
          ) : currentText ? (
            <>
              <div 
                className="relative p-4 border rounded-md bg-muted/50 text-lg font-mono leading-relaxed whitespace-pre-wrap select-none"
                onCopy={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              >
                {normalizedContent.split("").map((char, index) => (
                  <span key={index} className={cn(getCharClass(char, index))}>{char}</span>
                ))}
              </div>
              <Textarea ref={inputRef} value={inputText} onChange={handleInputChange} placeholder="Start typing here..." className="text-lg font-mono" rows={8} disabled={!!endTime || timeState !== 'ACTIVE'} />
            </>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <PartyPopper className="mx-auto h-12 w-12 mb-4 text-vibrant-gold" />
              <p className="text-lg font-semibold">You've mastered all the texts!</p>
              <p>Please ask an admin to add more.</p>
            </div>
          )}
          
          {/* Only show restart button for daily challenges */}
          {timeState === 'ACTIVE' && taskId && (
            <div className="flex justify-end">
              <Button onClick={resetTest} disabled={!!endTime} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">
                <RefreshCw className="mr-2 h-4 w-4" /> Restart Challenge
              </Button>
            </div>
          )}
          
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