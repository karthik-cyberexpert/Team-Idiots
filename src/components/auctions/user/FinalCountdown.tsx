"use client";

import * as React from "react";
import { Timer } from "lucide-react";

interface FinalCountdownProps {
  timeLeft: number;
}

export const FinalCountdown = ({ timeLeft }: FinalCountdownProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-destructive/10 rounded-lg">
      <p className="text-sm font-semibold text-destructive animate-pulse">FINAL 30 SECONDS!</p>
      <div className="relative flex items-center justify-center mt-2">
        <Timer className="h-10 w-10 text-destructive" />
        <p className="text-4xl font-bold text-destructive ml-2">
          {timeLeft}
        </p>
        <div className="absolute h-16 w-16 border-2 border-destructive rounded-full animate-ping opacity-75"></div>
      </div>
      <p className="text-xs text-destructive/80 mt-2">Bidding is now blind!</p>
    </div>
  );
};