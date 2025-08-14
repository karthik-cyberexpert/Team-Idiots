"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UserCog, Users, Sparkles, HeartCrack } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

const generateDailyRewards = async () => {
  const { data, error } = await supabase.functions.invoke("generate-daily-buddy-rewards");
  if (error) throw new Error(error.message);
  return data;
};

const resetAllBuddies = async () => {
  const { data, error } = await supabase.functions.invoke("weekly-buddy-reset");
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
  const queryClient = useQueryClient();
  const [isResetConfirmOpen, setIsResetConfirmOpen] = React.useState(false);
  const { data, isLoading, error } = useQuery<BuddyPair[]>({
    queryKey: ["allBuddyPairs"],
    queryFn: fetchAllBuddyPairs,
    refetchInterval: 1000,
  });

  const generateRewardsMutation = useMutation({
    mutationFn: generateDailyRewards,
    onSuccess: (data) => {
      showSuccess(data.message || "Daily rewards generated successfully!");
      queryClient.invalidateQueries({ queryKey: ["buddyRewardData"] });
    },
    onError: (err: Error) => {
      showError(err.message);
    },
  });

  const resetBuddiesMutation = useMutation({
    mutationFn: resetAllBuddies,
    onSuccess: (data) => {
      showSuccess(data.message || "All buddy pairs have been reset.");
      queryClient.invalidateQueries({ queryKey: ["allBuddyPairs"] });
      queryClient.invalidateQueries({ queryKey: ["buddyData"] });
      setIsResetConfirmOpen(false);
    },
    onError: (err: Error) => {
      showError(err.message);
      setIsResetConfirmOpen(false);
    },
  });

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Buddies Management</h1>
          <div className="flex gap-2">
            <Button onClick={() => generateRewardsMutation.mutate()} disabled={generateRewardsMutation.isPending}>
              <Sparkles className="mr-2 h-4 w-4" />
              {generateRewardsMutation.isPending ? "Generating..." : "Generate Today's Rewards"}
            </Button>
            <Button variant="destructive" onClick={() => setIsResetConfirmOpen(true)} disabled={resetBuddiesMutation.isPending}>
              <HeartCrack className="mr-2 h-4 w-4" />
              {resetBuddiesMutation.isPending ? "Resetting..." : "Reset All Pairs"}
            </Button>
          </div>
        </div>
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
              <div className="overflow-x-auto">
                <DataTable columns={columns} data={data} />
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4" />
                <p>No buddy pairs have been formed yet.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unpair ALL buddies across the platform. This action is intended for the weekly reset and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => resetBuddiesMutation.mutate()} disabled={resetBuddiesMutation.isPending}>
              {resetBuddiesMutation.isPending ? "Resetting..." : "Confirm Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BuddiesManagementPage;