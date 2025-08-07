"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Pickaxe, Timer } from "lucide-react";
import { showError, showSuccess } from "@/utils/toast";
import { Progress } from "@/components/ui/progress";
import { intervalToDuration, formatDuration } from "date-fns";
import Confetti from 'react-dom-confetti';

interface GoldMineStatus {
  clicks_this_hour: number;
  next_reset: string;
}

const fetchGoldMineStatus = async (): Promise<GoldMineStatus> => {
  const { data, error } = await supabase.functions.invoke("get-gold-mine-status");
  if (error) throw new Error(error.message);
  return data;
};

const logGoldMineClick = async (): Promise<GoldMineStatus & { success: boolean; message: string }> => {
  const { data, error } = await supabase.functions.invoke("log-gold-mine-click");
  if (error) throw new Error(error.message);
  return data;
};

const CountdownTimer = ({ targetDate, onEnd }: { targetDate: string, onEnd: () => void }) => {
  const [timeLeft, setTimeLeft] = React.useState("");

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(targetDate);
      if (now >= end) {
        setTimeLeft("Ready!");
        clearInterval(interval);
        onEnd();
      } else {
        const duration = intervalToDuration({ start: now, end });
        setTimeLeft(formatDuration(duration, { format: ['minutes', 'seconds'] }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onEnd]);

  return (
    <div className="flex items-center justify-center gap-2 text-lg font-semibold text-muted-foreground">
      <Timer className="h-5 w-5" />
      <span>Next clicks in: {timeLeft}</span>
    </div>
  );
};

const GoldMinePage = () => {
  const queryClient = useQueryClient();
  const [confettiActive, setConfettiActive] = React.useState(false);

  const { data: status, isLoading } = useQuery<GoldMineStatus>({
    queryKey: ["goldMineStatus"],
    queryFn: fetchGoldMineStatus,
  });

  const clickMutation = useMutation({
    mutationFn: logGoldMineClick,
    onSuccess: (data) => {
      if (data.success) {
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 100);
        queryClient.setQueryData(["goldMineStatus"], {
          clicks_this_hour: data.clicks_this_hour,
          next_reset: data.next_reset,
        });
        queryClient.invalidateQueries({ queryKey: ["gameLeaderboard"] });
      } else {
        showError(data.message);
        queryClient.setQueryData(["goldMineStatus"], {
          clicks_this_hour: data.clicks_this_hour,
          next_reset: data.next_reset,
        });
      }
    },
    onError: (err: Error) => showError(err.message),
  });

  const clicksThisHour = status?.clicks_this_hour || 0;
  const limitReached = clicksThisHour >= 100;

  return (
    <div className="flex items-center justify-center h-full">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl">Gold Mine</CardTitle>
          <CardDescription>Click the button to earn Game Points. Limit of 100 GP per hour.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center space-y-6 p-8">
          {isLoading ? (
            <Skeleton className="h-64 w-64 rounded-full" />
          ) : (
            <>
              <div className="relative">
                <button
                  onClick={() => clickMutation.mutate()}
                  disabled={limitReached || clickMutation.isPending}
                  className="w-64 h-64 rounded-full bg-vibrant-gold hover:bg-yellow-500 text-yellow-900 font-bold text-2xl flex flex-col items-center justify-center shadow-lg transition-transform transform hover:scale-105 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100"
                >
                  <Pickaxe className="h-16 w-16 mb-2" />
                  <span>1 CLICK = 1 GP</span>
                </button>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <Confetti active={confettiActive} config={{
                    angle: 90, spread: 360, startVelocity: 20, elementCount: 50, duration: 1000
                  }} />
                </div>
              </div>
              <div className="w-full space-y-2">
                <Progress value={clicksThisHour} max={100} />
                <p className="text-sm text-muted-foreground">{clicksThisHour} / 100 GP earned this hour</p>
              </div>
              {limitReached && status?.next_reset && (
                <CountdownTimer 
                  targetDate={status.next_reset} 
                  onEnd={() => queryClient.invalidateQueries({ queryKey: ["goldMineStatus"] })} 
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GoldMinePage;