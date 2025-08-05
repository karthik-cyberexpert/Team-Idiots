"use client";

import * as React from "react";
import { Timer } from "lucide-react";

interface ChallengeTimerProps {
  endTime: Date;
}

export const ChallengeTimer = ({ endTime }: ChallengeTimerProps) => {
  const [remaining, setRemaining] = React.useState("");

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now >= endTime) {
        setRemaining("00:00");
        clearInterval(interval);
      } else {
        const totalSeconds = Math.floor((endTime.getTime() - now.getTime()) / 1000);
        const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');
        setRemaining(`${minutes}:${seconds}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return (
    <div className="flex items-center gap-2 text-lg font-semibold text-vibrant-red">
      <Timer className="h-5 w-5" />
      <span>{remaining}</span>
    </div>
  );
};