"use client";

import * as React from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const queryKeyMap: { [key: string]: string[] } = {
  "/dashboard": ["userTasks", "notes", "channels", "leaderboard", "xpHistory"],
  "/dashboard/notes": ["notes"],
  "/dashboard/chat": ["channels", "messages"],
  "/dashboard/tasks": ["userTasks"],
  "/dashboard/leaderboard": ["leaderboard"],
  "/dashboard/xp-history": ["xpHistory"],
  "/admin/users": ["users"],
  "/admin/tasks": ["adminTasks"],
  "/admin/data-management": ["channels", "messages", "notes"],
};

export const RefreshButton = () => {
  const queryClient = useQueryClient();
  const location = useLocation();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    const path = location.pathname;
    let invalidatedCount = 0;

    // Find the most specific matching query keys
    const matchingKeys = Object.keys(queryKeyMap)
      .filter(key => path.startsWith(key))
      .sort((a, b) => b.length - a.length); // Sort by length to get most specific match first

    const keysToInvalidate = new Set<string>();
    if (matchingKeys.length > 0) {
      // Add all keys from the most specific match
      queryKeyMap[matchingKeys[0]].forEach(key => keysToInvalidate.add(key));
    } else {
      // Fallback: if no specific route match, invalidate common dashboard keys
      ["userTasks", "notes", "channels", "leaderboard", "xpHistory", "users", "adminTasks"].forEach(key => keysToInvalidate.add(key));
    }

    try {
      for (const key of Array.from(keysToInvalidate)) {
        await queryClient.invalidateQueries({ queryKey: [key] });
        invalidatedCount++;
      }
      showSuccess(`Refreshed ${invalidatedCount} data sections.`);
    } catch (error) {
      console.error("Error during refresh:", error);
      showError("Failed to refresh data.");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={isRefreshing}
      className={isRefreshing ? "animate-spin" : ""}
    >
      <RefreshCw className="h-5 w-5" />
      <span className="sr-only">Refresh Data</span>
    </Button>
  );
};