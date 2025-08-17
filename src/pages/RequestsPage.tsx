"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Handshake } from "lucide-react";
import { CreateRequestForm } from "@/components/requests/CreateRequestForm";
import { IncomingRequestsList } from "@/components/requests/IncomingRequestsList";
import { OutgoingRequestsList } from "@/components/requests/OutgoingRequestsList";
import { Request } from "@/types/request";

interface UserRequests {
  incoming: Request[];
  outgoing: Request[];
}

const fetchUserRequests = async (): Promise<UserRequests> => {
  const { data, error } = await supabase.functions.invoke("get-user-requests");
  if (error) throw new Error(error.message);
  return data;
};

const RequestsPage = () => {
  const { data, isLoading, error } = useQuery<UserRequests>({
    queryKey: ["userRequests"],
    queryFn: fetchUserRequests,
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Handshake className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Requests</h1>
      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Request</TabsTrigger>
          <TabsTrigger value="incoming">
            Incoming
            {data?.incoming && data.incoming.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-primary rounded-full">
                {data.incoming.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
        </TabsList>
        <TabsContent value="create">
          <CreateRequestForm />
        </TabsContent>
        <TabsContent value="incoming">
          <IncomingRequestsList requests={data?.incoming || []} />
        </TabsContent>
        <TabsContent value="outgoing">
          <OutgoingRequestsList requests={data?.outgoing || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequestsPage;