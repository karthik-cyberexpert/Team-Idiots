"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { Check, X } from "lucide-react";

interface Invitation {
  id: string;
  sender: {
    full_name: string;
  };
}

interface IncomingInvitationsProps {
  invitations: Invitation[];
}

const respondToInvite = async ({ invitationId, response }: { invitationId: string; response: 'accepted' | 'rejected' }) => {
  const { error } = await supabase.functions.invoke("respond-to-buddy-invite", {
    body: { invitationId, response },
  });
  if (error) throw new Error(error.message);
};

export const IncomingInvitations = ({ invitations }: IncomingInvitationsProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: respondToInvite,
    onSuccess: (_, variables) => {
      showSuccess(`Invitation ${variables.response}.`);
      queryClient.invalidateQueries({ queryKey: ["buddyData"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incoming Buddy Requests</CardTitle>
        <CardDescription>You have invitations waiting for your response.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {invitations.map(invite => (
          <div key={invite.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
            <p>From: <span className="font-semibold">{invite.sender.full_name}</span></p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-vibrant-green" onClick={() => mutation.mutate({ invitationId: invite.id, response: 'accepted' })}>
                <Check className="h-4 w-4 mr-1" /> Accept
              </Button>
              <Button size="sm" variant="ghost" className="text-vibrant-red" onClick={() => mutation.mutate({ invitationId: invite.id, response: 'rejected' })}>
                <X className="h-4 w-4 mr-1" /> Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};