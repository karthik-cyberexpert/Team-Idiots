"use client";

import * as React from "react";
import { Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChallengeTimerProps {
  startTime: Date;
  endTime: Date;
}

export const ChallengeTimer = ({ startTime, endTime }: ChallengeTimerProps) => {
  const [remaining, setRemaining] = React.useState("");
  const [timerColorClass, setTimerColorClass] = React.useState("text-vibrant-green");

  const totalDuration = React.useMemo(() => endTime.getTime() - startTime.getTime(), [startTime, endTime]);

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      if (now >= endTime) {
        setRemaining("00:00:00");
        setTimerColorClass("text-vibrant-red");
        return;
      }
      
      const remainingTime = endTime.getTime() - now.getTime();
      const percentageRemaining = (remainingTime / totalDuration) * 100;

      if (percentageRemaining <= 10) {
        setTimerColorClass("text-vibrant-red animate-pulse");
      } else if (percentageRemaining <= 30) {
        setTimerColorClass("text-vibrant-orange");
      } else {
        setTimerColorClass("text-vibrant-green");
      }

      const totalSeconds = Math.floor(remainingTime / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setRemaining(formattedTime);
    };

    updateTimer();
    
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime, totalDuration]);

  return (
    <div className={cn("flex items-center gap-2 text-lg font-semibold", timerColorClass)}>
      <Timer className="h-5 w-5" />
      <span>{remaining}</span>
    </div>
  );
};