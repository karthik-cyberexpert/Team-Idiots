"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HelpCircle, Check, X, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import Confetti from 'react-dom-confetti';
import { QuizSet } from "@/types/quiz";
import { EventCountdown } from "@/components/game/EventCountdown";

const fetchActiveQuiz = async (): Promise<QuizSet | null> => {
  const { data, error } = await supabase.functions.invoke("get-active-quiz-for-user");
  if (error) throw new Error(error.message);
  return data;
};

const submitAnswer = async (questionId: string, selectedIndex: number): Promise<{ correct: boolean; pointsAwarded: number }> => {
  const { data, error } = await supabase.functions.invoke("submit-quiz-answer", {
    body: { questionId, selectedIndex },
  });
  if (error) throw new Error(error.message);
  return data;
};

const QuizPage = () => {
  const queryClient = useQueryClient();
  const [quizSet, setQuizSet] = React.useState<QuizSet | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = React.useState(0);
  const [selectedAnswer, setSelectedAnswer] = React.useState<number | null>(null);
  const [isCorrect, setIsCorrect] = React.useState<boolean | null>(null);
  const [isFinished, setIsFinished] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const [finalScoreData, setFinalScoreData] = React.useState<{ score: number; rewardType: string } | null>(null);
  const [confettiActive, setConfettiActive] = React.useState(false);
  const [startDateTime, setStartDateTime] = React.useState<Date | null>(null);
  const [isUpcoming, setIsUpcoming] = React.useState(false);

  const { data, isLoading, error, refetch } = useQuery<QuizSet | null>({
    queryKey: ["activeQuiz"],
    queryFn: fetchActiveQuiz,
    refetchInterval: 1000, // Fetch every second
  });

  React.useEffect(() => {
    if (data) {
      const now = new Date();
      const [startH, startM] = data.start_time.split(':').map(Number);
      const sdt = new Date(data.assign_date);
      sdt.setUTCHours(startH, startM, 0, 0);
      setStartDateTime(sdt);

      if (now < sdt) {
        setIsUpcoming(true);
        setQuizSet(null);
      } else {
        setIsUpcoming(false);
        if (!isFinished) {
          setQuizSet(data);
          if (data.quiz_questions.length === 0) {
            setIsFinished(true);
          }
        }
      }
    } else {
      setQuizSet(null);
      setStartDateTime(null);
      setIsUpcoming(false);
    }
  }, [data, isFinished]);

  const answerMutation = useMutation({
    mutationFn: ({ questionId, selectedIndex }: { questionId: string; selectedIndex: number }) => submitAnswer(questionId, selectedIndex),
    onSuccess: (data) => {
      setIsCorrect(data.correct);
      let newScore = score;
      if (data.correct) {
        newScore = score + data.pointsAwarded;
        setScore(newScore);
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 100);
      }
      setTimeout(() => {
        if (currentQuestionIndex + 1 < (quizSet?.quiz_questions.length || 0)) {
          setCurrentQuestionIndex(prev => prev + 1);
          setSelectedAnswer(null);
          setIsCorrect(null);
        } else {
          setFinalScoreData({ score: newScore, rewardType: quizSet!.reward_type });
          setIsFinished(true);
        }
      }, 1500);
    },
    onError: (err: Error) => {
      showError(err.message);
      setSelectedAnswer(null);
    },
  });

  const handleAnswerClick = (index: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    const questionId = quizSet?.quiz_questions[currentQuestionIndex].id;
    if (questionId) {
      answerMutation.mutate({ questionId, selectedIndex: index });
    }
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <HelpCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  if (isUpcoming && startDateTime) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>{data?.title}</CardTitle>
          <CardDescription>The quiz will begin soon. Get ready!</CardDescription>
        </CardHeader>
        <CardContent>
          <EventCountdown
            startTime={startDateTime}
            onEnd={() => refetch()}
            title="Quiz Starting Soon!"
            description="The quiz will begin in:"
          />
        </CardContent>
      </Card>
    );
  }

  if (isFinished) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Quiz Time!</CardTitle>
        </CardHeader>
        <CardContent className="py-10">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">
            You've completed today's quiz!
          </p>
          {finalScoreData ? (
            <p className="text-2xl font-bold mt-2">You scored {finalScoreData.score} {finalScoreData.rewardType.toUpperCase()}!</p>
          ) : (
            <p className="text-muted-foreground mt-2">Your results have been recorded.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!quizSet || quizSet.quiz_questions.length === 0) {
    return (
      <Card className="text-center">
        <CardHeader>
          <CardTitle>Quiz Time!</CardTitle>
        </CardHeader>
        <CardContent className="py-10">
          <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg text-muted-foreground">
            There is no active quiz right now. Check back later!
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentQuestion = quizSet.quiz_questions[currentQuestionIndex];

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>{quizSet.title}</CardTitle>
        <CardDescription>Question {currentQuestionIndex + 1} of {quizSet.quiz_questions.length}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xl font-semibold text-center">{currentQuestion.question}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <Confetti active={confettiActive} />
          </div>
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrectAnswer = isCorrect !== null && index === currentQuestion.correct_option_index;
            
            return (
              <Button
                key={index}
                variant="outline"
                className={cn(
                  "h-auto py-4 text-base whitespace-normal justify-start text-left",
                  isSelected && isCorrect === false && "bg-destructive/80 text-destructive-foreground animate-shake",
                  isCorrectAnswer && "bg-vibrant-green/80 text-white"
                )}
                onClick={() => handleAnswerClick(index)}
                disabled={selectedAnswer !== null}
              >
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
    </Card>
  );
};

export default QuizPage;