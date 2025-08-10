"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HelpCircle, Check, X, Trophy, Timer, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import Confetti from 'react-dom-confetti';
import { QuizSet, QuizQuestion } from "@/types/quiz";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthProvider";
import { useQuizState } from "@/contexts/QuizStateProvider";

type QuizState = 'idle' | 'playing' | 'results';
type Answer = { questionId: string; selectedIndex: number };

const fetchActiveQuiz = async (): Promise<QuizSet | null> => {
  const { data, error } = await supabase.functions.invoke("get-active-quiz-for-user");
  if (error) throw new Error(error.message);
  return data;
};

const submitQuizResults = async (quizSetId: string, answers: Answer[]): Promise<{ correctCount: number; pointsAwarded: number }> => {
  const { data, error } = await supabase.functions.invoke("submit-quiz-results", {
    body: { quizSetId, answers },
  });
  if (error) throw new Error(error.message);
  return data;
};

const penalizeQuizAttempt = async ({ quizSetId, penaltyAmount }: { quizSetId: string, penaltyAmount: number }) => {
  const { data, error } = await supabase.functions.invoke("penalize-quiz-attempt", {
    body: { quizSetId, penaltyAmount },
  });
  if (error) throw new Error(error.message);
  return data;
};

const QuizPage = () => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const { setIsQuizActive } = useQuizState();
  const [quizState, setQuizState] = React.useState<QuizState>('idle');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [isLeaveConfirmOpen, setIsLeaveConfirmOpen] = React.useState(false);
  const [shuffledQuestions, setShuffledQuestions] = React.useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [answers, setAnswers] = React.useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = React.useState<number | null>(null);
  const [finalResult, setFinalResult] = React.useState<{ correctCount: number; pointsAwarded: number } | null>(null);
  const [confettiActive, setConfettiActive] = React.useState(false);

  const { data: activeQuiz, isLoading, error } = useQuery<QuizSet | null>({
    queryKey: ["activeQuiz"],
    queryFn: fetchActiveQuiz,
    refetchOnWindowFocus: false,
  });

  const resultsMutation = useMutation({
    mutationFn: () => submitQuizResults(activeQuiz!.id, answers),
    onSuccess: (data) => {
      setFinalResult(data);
      queryClient.invalidateQueries({ queryKey: ["gameLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["xpHistory"] });
      queryClient.invalidateQueries({ queryKey: ["activeQuiz"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const leaveQuizMutation = useMutation({
    mutationFn: () => penalizeQuizAttempt({ quizSetId: activeQuiz!.id, penaltyAmount: 250 }),
    onSuccess: (data) => {
      showSuccess(data.message);
      queryClient.invalidateQueries({ queryKey: ["gameLeaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["activeQuiz"] });
      setQuizState('idle');
      setIsLeaveConfirmOpen(false);
    },
    onError: (err: Error) => {
      showError(err.message);
      setIsLeaveConfirmOpen(false);
    },
  });

  React.useEffect(() => {
    if (quizState === 'playing') {
      setIsQuizActive(true);
    } else {
      setIsQuizActive(false);
    }
    return () => setIsQuizActive(false);
  }, [quizState, setIsQuizActive]);

  React.useEffect(() => {
    const handleBeforeUnload = () => {
      if (quizState === 'playing' && activeQuiz && session?.access_token) {
        const penaltyData = {
          quizSetId: activeQuiz.id,
          penaltyAmount: 250,
        };
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        };
        fetch(`https://dlzrqqbksdookwdllydp.supabase.co/functions/v1/penalize-quiz-attempt`, {
          method: 'POST',
          headers,
          body: JSON.stringify(penaltyData),
          keepalive: true,
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [quizState, activeQuiz, session]);

  React.useEffect(() => {
    if (quizState !== 'playing' || timeLeft === null) return;
    if (timeLeft <= 0) {
      setQuizState('results');
      return;
    }
    const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(timer);
  }, [quizState, timeLeft]);

  const startQuiz = () => {
    if (!activeQuiz) return;
    const questions = [...activeQuiz.quiz_questions].sort(() => 0.5 - Math.random());
    setShuffledQuestions(questions);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setFinalResult(null);
    if (activeQuiz.time_limit_minutes) {
      setTimeLeft(activeQuiz.time_limit_minutes * 60);
    }
    setQuizState('playing');
  };

  const handleConfirmStart = () => {
    setIsConfirmDialogOpen(false);
    startQuiz();
  };

  const handleAnswerClick = (selectedIndex: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(selectedIndex);
    const currentQuestion = shuffledQuestions[currentQuestionIndex];
    const correct = selectedIndex === currentQuestion.correct_option_index;
    setIsCorrect(correct);
    setAnswers(prev => [...prev, { questionId: currentQuestion.id, selectedIndex }]);
    if (correct) {
      setConfettiActive(true);
      setTimeout(() => setConfettiActive(false), 100);
    }
    setTimeout(() => {
      if (currentQuestionIndex + 1 < shuffledQuestions.length) {
        setCurrentQuestionIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setQuizState('results');
      }
    }, 1500);
  };

  const handleFinishTest = () => {
    resultsMutation.mutate();
  };

  const handleLeaveQuiz = () => {
    leaveQuizMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader><Skeleton className="h-8 w-1/2" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full" /></CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Quiz</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  const renderContent = () => {
    if (!activeQuiz) {
      return (
        <Card className="text-center max-w-2xl mx-auto">
          <CardHeader><CardTitle>Quiz Time!</CardTitle></CardHeader>
          <CardContent className="py-10">
            <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground">You've completed all available quizzes. Great job!</p>
            <p className="text-sm text-muted-foreground">Check back later for more.</p>
          </CardContent>
        </Card>
      );
    }

    if (quizState === 'playing') {
      const currentQuestion = shuffledQuestions[currentQuestionIndex];
      const minutes = timeLeft !== null ? Math.floor(timeLeft / 60) : 0;
      const seconds = timeLeft !== null ? timeLeft % 60 : 0;
  
      return (
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>{activeQuiz.title}</CardTitle>
              <CardDescription>Question {currentQuestionIndex + 1} of {shuffledQuestions.length}</CardDescription>
            </div>
            {timeLeft !== null && (
              <div className="flex items-center gap-2 font-semibold text-lg">
                <Timer className="h-5 w-5" />
                <span>{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}</span>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-xl font-semibold text-center min-h-[3em]">{currentQuestion.question}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"><Confetti active={confettiActive} /></div>
              {currentQuestion.options.map((option, index) => {
                const isSelected = selectedAnswer === index;
                const isCorrectAnswer = isCorrect !== null && index === currentQuestion.correct_option_index;
                return (
                  <Button key={index} variant="outline" className={cn("h-auto py-4 text-base whitespace-normal justify-start text-left", isSelected && isCorrect === false && "bg-destructive/80 text-destructive-foreground animate-shake", isCorrectAnswer && "bg-vibrant-green/80 text-white")} onClick={() => handleAnswerClick(index)} disabled={selectedAnswer !== null}>
                    <div className="flex items-center">
                      <div className="mr-4 h-8 w-8 rounded-full border flex items-center justify-center flex-shrink-0">
                        {isSelected && isCorrect === false && <X className="h-5 w-5" />}
                        {isCorrectAnswer && <Check className="h-5 w-5" />}
                      </div>
                      <span>{option}</span>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button variant="destructive" onClick={() => setIsLeaveConfirmOpen(true)}>
              <LogOut className="mr-2 h-4 w-4" />
              Leave Quiz
            </Button>
          </CardFooter>
        </Card>
      );
    }
  
    if (quizState === 'results') {
      const correctCount = answers.filter((ans, i) => ans.selectedIndex === shuffledQuestions[i].correct_option_index).length;
      return (
        <Card className="text-center max-w-2xl mx-auto">
          <CardHeader><CardTitle>Quiz Complete!</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl">You answered <span className="font-bold text-vibrant-green">{correctCount}</span> correctly out of {answers.length}.</p>
            {resultsMutation.isPending && <p>Calculating your rewards...</p>}
            {resultsMutation.isError && <p className="text-vibrant-red">Could not save results. Please try again.</p>}
            {finalResult && <p className="text-2xl font-bold">You earned {finalResult.pointsAwarded} {activeQuiz.reward_type.toUpperCase()}!</p>}
            
            {!finalResult && (
              <Button onClick={handleFinishTest} disabled={resultsMutation.isPending}>
                {resultsMutation.isPending ? "Calculating..." : "Finish & Claim Rewards"}
              </Button>
            )}
            {finalResult && (
               <Button onClick={() => { setQuizState('idle'); queryClient.invalidateQueries({ queryKey: ['activeQuiz'] }); }}>Back to Quizzes</Button>
            )}
          </CardContent>
        </Card>
      );
    }

    // idle state
    return (
        <Card className="max-w-2xl mx-auto text-center">
            <CardHeader><CardTitle>{activeQuiz.title}</CardTitle><CardDescription>Are you ready to test your knowledge?</CardDescription></CardHeader>
            <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-left p-4 border rounded-md">
                <p><strong>Questions:</strong> {activeQuiz.quiz_questions.length}</p>
                <p><strong>Reward:</strong> {activeQuiz.points_per_question} {activeQuiz.reward_type.toUpperCase()} per correct answer</p>
                <p><strong>Time Limit:</strong> {activeQuiz.time_limit_minutes ? `${activeQuiz.time_limit_minutes} minutes` : 'None'}</p>
                <p><strong>Enroll Before:</strong> {activeQuiz.enrollment_deadline ? format(new Date(activeQuiz.enrollment_deadline), "PPP p") : 'No deadline'}</p>
            </div>
            <Button size="lg" onClick={() => setIsConfirmDialogOpen(true)}>Start Quiz</Button>
            </CardContent>
        </Card>
    );
  };

  return (
    <>
      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Quiz Rules</AlertDialogTitle>
            <AlertDialogDescription>
              Once you start, the timer will begin. If you refresh or close the tab, your progress will be lost and you will have to start over. Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmStart}>Proceed</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isLeaveConfirmOpen} onOpenChange={setIsLeaveConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to leave?</AlertDialogTitle>
            <AlertDialogDescription>
              Leaving the quiz will incur a penalty of <span className="font-bold text-vibrant-red">250 GP</span>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Quiz</AlertDialogCancel>
            <AlertDialogAction onClick={handleLeaveQuiz} disabled={leaveQuizMutation.isPending}>
              {leaveQuizMutation.isPending ? "Leaving..." : "Leave & Pay Penalty"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {renderContent()}
    </>
  );
};

export default QuizPage;