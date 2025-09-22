"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Request } from "@/types/request";
import { showSuccess, showError } from "@/utils/toast";
import { Check, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface IncomingRequestsListProps {
  requests: Request[];
}

const respondToRequest = async ({ requestId, response }: { requestId: string; response: 'approved' | 'denied' }) => {
  const { error } = await supabase.functions.invoke("respond-to-request", { body: { requestId, response } });
  if (error) throw new Error(error.message);
};

export const IncomingRequestsList = ({ requests }: IncomingRequestsListProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: respondToRequest,
    onSuccess: (_, variables) => {
      showSuccess(`Request ${variables.response}.`);
      queryClient.invalidateQueries({ queryKey: ["userRequests"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  if (requests.length === 0) {
    return <p className="text-muted-foreground text-center py-8">You have no incoming requests.</p>;
  }

  return (
    <div className="space-y-4">
      {requests.map(req => (
        <Card key={req.id}>
          <CardHeader>
            <CardTitle className="text-lg">Request from {req.requester.full_name}</CardTitle>
            <CardDescription>{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">Requesting: {req.request_type === 'gp' || req.request_type === 'xp' ? `${req.amount} ${req.request_type.toUpperCase()}` : `Power-up: ${req.power_up_type?.replace('_', ' ')}`}</p>
            <p className="italic text-muted-foreground mt-2">"{req.message}"</p>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" className="text-vibrant-red" onClick={() => mutation.mutate({ requestId: req.id, response: 'denied' })}>
              <X className="h-4 w-4 mr-1" /> Deny
            </Button>
            <Button size="sm" className="text-vibrant-green" onClick={() => mutation.mutate({ requestId: req.id, response: 'approved' })}>
              <Check className="h-4 w-4 mr-1" /> Approve
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};