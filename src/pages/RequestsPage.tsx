"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Handshake } from "lucide-react";
import { CreateRequestForm } from "@/components/requests/CreateRequestForm";
import { IncomingRequests } from "@/components/requests/IncomingRequests";
import { OutgoingRequests } from "@/components/requests/OutgoingRequests";
import { useSearchParams, useNavigate } from "react-router-dom";

const RequestsPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = searchParams.get('tab') || 'create';

  const handleTabChange = (value: string) => {
    navigate(`/dashboard/requests?tab=${value}`, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Handshake className="h-8 w-8" />
        <h1 className="text-2xl sm:text-3xl font-bold">Requests</h1>
      </div>
      <p className="text-muted-foreground">
        Request resources from other users or send a global request to everyone.
      </p>
      
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Create Request</TabsTrigger>
          <TabsTrigger value="incoming">Incoming</TabsTrigger>
          <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
        </TabsList>
        <TabsContent value="create" className="mt-4">
          <CreateRequestForm onSuccessfulRequest={() => handleTabChange('outgoing')} />
        </TabsContent>
        <TabsContent value="incoming" className="mt-4">
          <IncomingRequests />
        </TabsContent>
        <TabsContent value="outgoing" className="mt-4">
          <OutgoingRequests />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequestsPage;