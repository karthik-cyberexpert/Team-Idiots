"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { CheckCircle, CircleDashed } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

interface Activity {
  has_checked_in: boolean;
}

interface DailyCheckinProps {
  pairId: string;
  myActivity: Activity | null;
  buddyActivity: Activity | null;
}

const checkIn = async (pairId: string) => {
  const { error } = await supabase.functions.invoke("buddy-check-in", {
    body: { pairId },
  });
  if (error) throw new Error(error.message);
};

export const DailyCheckin = ({ pairId, myActivity, buddyActivity }: DailyCheckinProps) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const mutation = useMutation({
    mutationFn: () => checkIn(pairId),
    onSuccess: () => {
      showSuccess("You've checked in for today!");
      queryClient.invalidateQueries({ queryKey: ["buddyRewardData", pairId] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const myCheckin = myActivity?.has_checked_in;
  const buddyCheckin = buddyActivity?.has_checked_in;

  return (
    <div className="p-4 border rounded-lg space-y-4">
      <div className="flex justify-around items-center">
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">You</p>
          {myCheckin ? (
            <CheckCircle className="h-8 w-8 text-vibrant-green" />
          ) : (
            <CircleDashed className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="font-semibold">Your Buddy</p>
          {buddyCheckin ? (
            <CheckCircle className="h-8 w-8 text-vibrant-green" />
          ) : (
            <CircleDashed className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      </div>
      {!myCheckin && (
        <Button 
          className="w-full" 
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? "Checking in..." : "Check In for Today"}
        </Button>
      )}
    </div>
  );
};