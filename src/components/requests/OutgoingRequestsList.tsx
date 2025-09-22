"use client";

import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Request } from "@/types/request";
import { showSuccess, showError } from "@/utils/toast";
import { XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface OutgoingRequestsListProps {
  requests: Request[];
}

const cancelRequest = async (requestId: string) => {
  const { error } = await supabase.functions.invoke("cancel-request", { body: { requestId } });
  if (error) throw new Error(error.message);
};

export const OutgoingRequestsList = ({ requests }: OutgoingRequestsListProps) => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: cancelRequest,
    onSuccess: () => {
      showSuccess("Request cancelled.");
      queryClient.invalidateQueries({ queryKey: ["userRequests"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  if (requests.length === 0) {
    return <p className="text-muted-foreground text-center py-8">You have no outgoing requests.</p>;
  }

  return (
    <div className="space-y-4">
      {requests.map(req => (
        <Card key={req.id}>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-lg">Request to {req.is_global ? "All Users" : req.recipient?.full_name}</CardTitle>
                <CardDescription>{formatDistanceToNow(new Date(req.created_at), { addSuffix: true })}</CardDescription>
              </div>
              <Badge>{req.status}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">Requesting: {req.request_type === 'gp' || req.request_type === 'xp' ? `${req.amount} ${req.request_type.toUpperCase()}` : `Power-up: ${req.power_up_type?.replace('_', ' ')}`}</p>
            <p className="italic text-muted-foreground mt-2">"{req.message}"</p>
          </CardContent>
          {req.status === 'pending' && (
            <CardFooter className="flex justify-end">
              <Button size="sm" variant="ghost" onClick={() => mutation.mutate(req.id)}>
                <XCircle className="h-4 w-4 mr-1" /> Cancel
              </Button>
            </CardFooter>
          )}
        </Card>
      ))}
    </div>
  );
};