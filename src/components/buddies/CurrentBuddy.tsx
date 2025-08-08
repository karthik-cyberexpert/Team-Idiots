"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeartCrack } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";

interface BuddyPair {
  id: string;
  buddy: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

interface CurrentBuddyProps {
  buddyPair: BuddyPair;
}

const unpairBuddy = async (pairId: string) => {
  const { error } = await supabase.from("buddies").delete().eq("id", pairId);
  if (error) throw new Error(error.message);
};

export const CurrentBuddy = ({ buddyPair }: CurrentBuddyProps) => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const mutation = useMutation({
    mutationFn: () => unpairBuddy(buddyPair.id),
    onSuccess: () => {
      showSuccess("You are no longer buddies.");
      queryClient.invalidateQueries({ queryKey: ["buddyData"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>You are buddies with {buddyPair.buddy.full_name}!</CardTitle>
        <CardDescription>The daily reward system will be available soon.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback>{getInitials(profile?.full_name || '')}</AvatarFallback>
          </Avatar>
          <HeartCrack className="h-8 w-8 text-muted-foreground" />
          <Avatar className="h-16 w-16">
            <AvatarImage src={buddyPair.buddy.avatar_url || undefined} />
            <AvatarFallback>{getInitials(buddyPair.buddy.full_name)}</AvatarFallback>
          </Avatar>
        </div>
        <Button variant="destructive" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <HeartCrack className="mr-2 h-4 w-4" />
          {mutation.isPending ? "Unpairing..." : "Unpair"}
        </Button>
      </CardContent>
    </Card>
  );
};