"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";

interface Invitation {
  id: string;
  receiver: {
    full_name: string;
  };
}

interface OutgoingInvitationsProps {
  invitations: Invitation[];
}

const cancelInvite = async (invitationId: string) => {
  const { error } = await supabase
    .from("buddy_invitations")
    .update({ status: 'cancelled' })
    .eq('id', invitationId);
  if (error) throw new Error(error.message);
};

export const OutgoingInvitations = ({ invitations }: OutgoingInvitationsProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: cancelInvite,
    onSuccess: () => {
      showSuccess("Invitation cancelled.");
      queryClient.invalidateQueries({ queryKey: ["buddyData"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Invitations</CardTitle>
        <CardDescription>You have sent these invitations.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {invitations.map(invite => (
          <div key={invite.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
            <p>To: <span className="font-semibold">{invite.receiver.full_name}</span></p>
            <Button size="sm" variant="ghost" onClick={() => mutation.mutate(invite.id)}>
              Cancel
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};