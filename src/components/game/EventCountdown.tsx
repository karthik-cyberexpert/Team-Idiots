"use client";

import * as React from "react";
import { Timer } from "lucide-react";
import { formatDuration, intervalToDuration } from "date-fns";
import { cn } from "@/lib/utils";

interface EventCountdownProps {
  startTime: Date;
  onEnd: () => void;
  title: string;
  description: string;
}

export const EventCountdown = ({ startTime, onEnd, title, description }: EventCountdownProps) => {
  const [remaining, setRemaining] = React.useState("");
  const [timerColorClass, setTimerColorClass] = React.useState("text-vibrant-green");

  const totalDuration = React.useMemo(() => {
    const now = Date.now();
    // Ensure total duration is not negative if the component renders slightly after start time
    return Math.max(0, startTime.getTime() - now);
  }, [startTime]);

  React.useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      if (now >= startTime) {
        setRemaining("Starting now!");
        setTimerColorClass("text-vibrant-green");
        clearInterval(interval);
        // Use a short timeout to ensure the "Starting now!" message is visible before transitioning
        setTimeout(onEnd, 500);
        return;
      }

      const remainingTime = startTime.getTime() - now.getTime();
      const percentageRemaining = totalDuration > 0 ? (remainingTime / totalDuration) * 100 : 0;

      if (percentageRemaining <= 10) {
        setTimerColorClass("text-vibrant-red animate-pulse");
      } else if (percentageRemaining <= 30) {
        setTimerColorClass("text-vibrant-orange");
      } else {
        setTimerColorClass("text-vibrant-green");
      }

      const duration = intervalToDuration({ start: now, end: startTime });
      setRemaining(formatDuration(duration, { format: ['hours', 'minutes', 'seconds'] }));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startTime, onEnd, totalDuration]);

  return (
    <div className="text-center py-10 text-muted-foreground">
      <Timer className={cn("mx-auto h-12 w-12 mb-4", timerColorClass)} />
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-sm">{description}</p>
      <p className={cn("text-2xl font-bold mt-2", timerColorClass)}>{remaining}</p>
    </div>
  );
};