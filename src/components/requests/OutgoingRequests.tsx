"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Notification, RequestPayload } from "@/types/notification";
import { Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RequestNotification extends Notification {
  gift_payload: RequestPayload;
  recipient: { full_name: string } | null;
}

const fetchOutgoingRequests = async (): Promise<RequestNotification[]> => {
  const { data, error } = await supabase.functions.invoke("get-resource-requests");
  if (error) throw new Error(error.message);
  return (data.outgoing || []).filter((n: Notification) => n.gift_payload?.type === 'resource_request');
};

export const OutgoingRequests = () => {
  const { data: requests, isLoading } = useQuery({
    queryKey: ["outgoingRequests"],
    queryFn: fetchOutgoingRequests,
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
        <CardTitle>Outgoing Requests</CardTitle>
        <CardDescription>Requests you have sent to other users.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {requests && requests.length > 0 ? (
          requests.map(req => (
            <div key={req.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p>
                  You requested <span className="font-semibold">{getRequestDetails(req.gift_payload)}</span> from{' '}
                  <span className="font-semibold">
                    {req.gift_payload.is_global ? 'Everyone' : req.recipient?.full_name || 'Unknown User'}
                  </span>.
                </p>
                <p className="text-sm text-muted-foreground italic">"{req.message}"</p>
              </div>
              <Badge variant={req.gift_payload.status === 'fulfilled' ? 'default' : req.gift_payload.status === 'rejected' ? 'destructive' : 'secondary'}>{req.gift_payload.status}</Badge>
            </div>
          ))
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <Send className="mx-auto h-12 w-12 mb-4" />
            <p>You have not sent any requests.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};