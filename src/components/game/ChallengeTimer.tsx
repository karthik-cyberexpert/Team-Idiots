"use client";

import * as React from "react";
import { Timer } from "lucide-react";

interface ChallengeTimerProps {
  endTime: Date;
}

export const ChallengeTimer = ({ endTime }: ChallengeTimerProps) => {
  const [remaining, setRemaining] = React.useState("");

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      if (now >= endTime) {
        setRemaining("00:00:00");
        return;
      }
      
      const totalSeconds = Math.floor((endTime.getTime() - now.getTime()) / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      
      const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      setRemaining(formattedTime);
    };

    // Update immediately
    updateTimer();
    
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex items-center gap-2 text-lg font-semibold text-vibrant-red">
      <Timer className="h-5 w-5" />
      <span>{remaining}</span>
    </div>
  );
};