"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserCog, Users } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

interface BuddyPair {
  id: string;
  created_at: string;
  user_one: { full_name: string };
  user_two: { full_name: string };
}

const fetchAllBuddyPairs = async (): Promise<BuddyPair[]> => {
  const { data, error } = await supabase.functions.invoke("get-all-buddy-pairs");
  if (error) throw new Error(error.message);
  return data;
};

const columns: ColumnDef<BuddyPair>[] = [
  {
    accessorKey: "user_one.full_name",
    header: "Buddy 1",
  },
  {
    accessorKey: "user_two.full_name",
    header: "Buddy 2",
  },
  {
    accessorKey: "created_at",
    header: "Paired On",
    cell: ({ row }) => format(new Date(row.original.created_at), "PPP"),
  },
];

const BuddiesManagementPage = () => {
  const { data, isLoading, error } = useQuery<BuddyPair[]>({
    queryKey: ["allBuddyPairs"],
    queryFn: fetchAllBuddyPairs,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl sm:text-3xl font-bold">Buddies Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>All Buddy Pairs</CardTitle>
          <CardDescription>View all active buddy pairs in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : error ? (
            <Alert variant="destructive">
              <UserCog className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          ) : data && data.length > 0 ? (
            <DataTable columns={columns} data={data} />
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="mx-auto h-12 w-12 mb-4" />
              <p>No buddy pairs have been formed yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BuddiesManagementPage;