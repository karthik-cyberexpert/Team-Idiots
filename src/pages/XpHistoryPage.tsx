"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface XpHistoryEntry {
  id: string;
  user_id: string;
  xp_change: number;
  reason: string;
  related_task_id: string | null;
  created_at: string;
}

const fetchXpHistory = async (userId: string): Promise<XpHistoryEntry[]> => {
  const { data, error } = await supabase
    .from("xp_history")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

const XpHistoryPage = () => {
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

  const { data: xpHistory, isLoading, error } = useQuery<XpHistoryEntry[]>({
    queryKey: ["xpHistory", user?.id],
    queryFn: () => fetchXpHistory(user!.id),
    enabled: !!user && !authLoading,
  });

  // Real-time subscription for XP history updates
  React.useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`xp-history-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xp_history',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['xpHistory', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);


  if (authLoading || isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold">XP History</h1>
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <History className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-green dark:text-vibrant-orange">XP History</h1>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Your XP Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {xpHistory && xpHistory.length > 0 ? (
            <ul className="space-y-3">
              {xpHistory.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg shadow-sm">
                  <div className="flex items-center gap-3">
                    {entry.xp_change > 0 ? (
                      <ArrowUpCircle className="h-5 w-5 text-vibrant-green" />
                    ) : (
                      <ArrowDownCircle className="h-5 w-5 text-vibrant-red" />
                    )}
                    <div>
                      <p className="font-medium text-foreground">{entry.reason}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-bold",
                    entry.xp_change > 0 ? "text-vibrant-green" : "text-vibrant-red"
                  )}>
                    {entry.xp_change > 0 ? "+" : ""}{entry.xp_change} XP
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <History className="mx-auto h-12 w-12 mb-4" />
              <p>No XP history found yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default XpHistoryPage;