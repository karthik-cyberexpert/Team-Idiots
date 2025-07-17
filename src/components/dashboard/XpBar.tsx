"use client";

import * as React from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const XP_LEVEL_THRESHOLD = 100; // XP needed for one "level" or segment of the bar

export const XpBar = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-1/2 mb-2" />
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  const currentXp = profile?.xp || 0;
  const progressValue = (currentXp % XP_LEVEL_THRESHOLD) / XP_LEVEL_THRESHOLD * 100;
  const currentLevel = Math.floor(currentXp / XP_LEVEL_THRESHOLD) + 1;

  return (
    <Link to="/dashboard/xp-history" className="block">
      <Card className="hover:shadow-lg transition-shadow cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg font-medium">Your XP Progress</CardTitle>
          <Sparkles className="h-6 w-6 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {currentXp} XP
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Level {currentLevel} - {XP_LEVEL_THRESHOLD - (currentXp % XP_LEVEL_THRESHOLD)} XP to next level
          </p>
          <Progress value={progressValue} className="w-full" />
        </CardContent>
      </Card>
    </Link>
  );
};