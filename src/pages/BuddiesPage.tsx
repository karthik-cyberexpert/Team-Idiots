"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { FindBuddy } from "@/components/buddies/FindBuddy";
import { IncomingInvitations } from "@/components/buddies/IncomingInvitations";
import { OutgoingInvitations } from "@/components/buddies/OutgoingInvitations";
import { CurrentBuddy } from "@/components/buddies/CurrentBuddy";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users } from "lucide-react";

const fetchBuddyData = async (userId: string) => {
  const { data, error } = await supabase.functions.invoke('get-buddy-data');
  if (error) throw new Error(error.message);
  return data;
};

const BuddiesPage = () => {
  const { user } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['buddyData', user?.id],
    queryFn: () => fetchBuddyData(user!.id),
    enabled: !!user,
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Users className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  const hasIncoming = data.receivedInvitations && data.receivedInvitations.length > 0;
  const hasOutgoing = data.sentInvitations && data.sentInvitations.length > 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">My Buddies</h1>
      {data.buddyPair ? (
        <CurrentBuddy buddyPair={data.buddyPair} />
      ) : (
        <>
          {hasIncoming && <IncomingInvitations invitations={data.receivedInvitations} />}
          {hasOutgoing && <OutgoingInvitations invitations={data.sentInvitations} />}
          {!hasIncoming && !hasOutgoing && <FindBuddy availableUsers={data.availableUsers} />}
        </>
      )}
    </div>
  );
};

export default BuddiesPage;