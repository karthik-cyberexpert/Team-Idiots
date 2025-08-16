"use client";

import * as React from "react";
import { intervalToDuration, formatDuration } from "date-fns";

interface CountdownTimerProps {
  targetDate: string;
  onEnd?: () => void;
  className?: string;
}

export const CountdownTimer = ({ targetDate, onEnd, className }: CountdownTimerProps) => {
  const [timeLeft, setTimeLeft] = React.useState("");

  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const end = new Date(targetDate);
      if (now >= end) {
        setTimeLeft("Auction Ended");
        clearInterval(interval);
        if (onEnd) onEnd();
      } else {
        const duration = intervalToDuration({ start: now, end });
        setTimeLeft(formatDuration(duration, { format: ['days', 'hours', 'minutes', 'seconds'] }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, onEnd]);

  return <p className={className}>{timeLeft}</p>;
};