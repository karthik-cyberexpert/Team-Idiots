"use client";

import * as React from "react";
import { Timer } from "lucide-react";
import { formatDuration, intervalToDuration } from "date-fns";

interface GameCountdownProps {
  publishTime: Date;
  onEnd: () => void;
}

export const GameCountdown = ({ publishTime, onEnd }: GameCountdownProps) => {
  const [remaining, setRemaining] = React.useState("");

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (now >= publishTime) {
        clearInterval(interval);
        onEnd();
      } else {
        const duration = intervalToDuration({ start: now, end: publishTime });
        setRemaining(formatDuration(duration, { format: ['minutes', 'seconds'] }));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [publishTime, onEnd]);

  return (
    <div className="text-center py-10 text-muted-foreground">
      <Timer className="mx-auto h-12 w-12 mb-4 text-vibrant-blue animate-pulse" />
      <p className="text-lg font-semibold">Calculating Daily Challenge Results</p>
      <p className="text-sm">The leaderboard will be updated in:</p>
      <p className="text-2xl font-bold text-primary mt-2">{remaining}</p>
    </div>
  );
};