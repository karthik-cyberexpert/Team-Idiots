"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Gavel, FileUp, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SBBManagementData {
  pendingRequests: number;
  activeBattles: number;
}

const fetchSBBManagementData = async (): Promise<SBBManagementData> => {
  const { data, error } = await supabase.functions.invoke("get-sbb-management-data");
  if (error) throw new Error(error.message);
  return data;
};

const SpaceBossBattleManagementPage = () => {
  const { data, isLoading, error } = useQuery<SBBManagementData>({
    queryKey: ["sbbManagementData"],
    queryFn: fetchSBBManagementData,
  });

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (error) {
    return <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{error.message}</AlertDescription></Alert>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-blue dark:text-vibrant-pink">Space Boss Battle Management</h1>
      <p className="text-muted-foreground">Configure challenges, schedule battles, and manage player requests.</p>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-vibrant-red">{data?.pendingRequests || 0}</div>
            <p className="text-xs text-muted-foreground">New battle requests from users.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Battles</CardTitle>
            <Gavel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-vibrant-green">{data?.activeBattles || 0}</div>
            <p className="text-xs text-muted-foreground">Currently ongoing battles.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Question Banks</CardTitle>
            <FileUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Button className="w-full" variant="outline">Manage Challenges</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Battle Scheduler</CardTitle><CardDescription>Create and manage upcoming boss battles.</CardDescription></CardHeader>
        <CardContent><Button>Schedule New Battle</Button></CardContent>
      </Card>
    </div>
  );
};

export default SpaceBossBattleManagementPage;