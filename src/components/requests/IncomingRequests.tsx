"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Notification, RequestPayload } from "@/types/notification";
import { Handshake, Check, X } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { Badge } from "@/components/ui/badge";

interface RequestNotification extends Notification {
  gift_payload: RequestPayload;
}

const fetchIncomingRequests = async (): Promise<RequestNotification[]> => {
  const { data, error } = await supabase.functions.invoke("get-resource-requests");
  if (error) throw new Error(error.message);
  return (data.incoming || []).filter((n: Notification) => n.gift_payload?.type === 'resource_request');
};

const respondToRequest = async ({ notificationId, response }: { notificationId: string, response: 'fulfilled' | 'rejected' }) => {
    const { error } = await supabase.functions.invoke("respond-to-resource-request", { body: { notificationId, response } });
    if (error) throw new Error(error.message);
};

export const IncomingRequests = () => {
  const queryClient = useQueryClient();
  const { data: requests, isLoading } = useQuery({
    queryKey: ["incomingRequests"],
    queryFn: fetchIncomingRequests,
  });

  const mutation = useMutation({
    mutationFn: respondToRequest,
    onSuccess: () => {
      showSuccess("Response sent!");
      queryClient.invalidateQueries({ queryKey: ["incomingRequests"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: Error) => showError(err.message),
  });

  const getRequestDetails = (payload: RequestPayload) => {
    if (payload.request_type === 'gp') return `${payload.amount} GP`;
    if (payload.request_type === 'xp') return `${payload.amount} XP`;
    return '';
  };

  if (isLoading) return <Skeleton className="h-48 w-full" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Incoming Requests</CardTitle>
        <CardDescription>Requests from other users waiting for your response.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests && requests.length > 0 ? (
          requests.map(req => (
            <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p><span className="font-semibold">{req.gift_payload.requester_name}</span> is requesting <span className="font-semibold">{getRequestDetails(req.gift_payload)}</span>.</p>
                <p className="text-sm text-muted-foreground italic">"{req.message}"</p>
              </div>
              {req.gift_payload.status === 'pending' ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" className="text-vibrant-green" onClick={() => mutation.mutate({ notificationId: req.id, response: 'fulfilled' })} disabled={mutation.isPending}>
                    <Check className="h-4 w-4 mr-1" /> Fulfill
                  </Button>
                  <Button size="sm" variant="ghost" className="text-vibrant-red" onClick={() => mutation.mutate({ notificationId: req.id, response: 'rejected' })} disabled={mutation.isPending}>
                    <X className="h-4 w-4 mr-1" /> Reject
                  </Button>
                </div>
              ) : (
                <Badge variant={req.gift_payload.status === 'fulfilled' ? 'default' : 'destructive'}>{req.gift_payload.status}</Badge>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Handshake className="mx-auto h-12 w-12 mb-4" />
            <p>You have no incoming requests.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};