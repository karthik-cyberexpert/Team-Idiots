"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getColumns } from "./users/columns";
import { DataTable } from "@/components/ui/data-table";
import { User } from "@/types/user";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess, showError } from "@/utils/toast";
import { AddUserDialog } from "./users/AddUserDialog";
import { EditUserDialog } from "./users/EditUserDialog";
import { ManualXpChangeDialog } from "./users/ManualXpChangeDialog";
import { ManualGamePointsChangeDialog } from "./users/ManualGamePointsChangeDialog";
import { PaginationState } from "@tanstack/react-table";

interface PaginatedUsersResponse {
  users: User[];
  totalCount: number;
}

const fetchUsers = async (page: number, perPage: number): Promise<PaginatedUsersResponse> => {
  const { data, error } = await supabase.functions.invoke("get-users", {
    body: { page, perPage },
  });
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  return data as PaginatedUsersResponse;
};

const deleteUser = async (userId: string) => {
  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: { userId },
  });
  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
  if (data && data.error) {
    throw new Error(`Failed to delete user: ${data.error}`);
  }
};

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [userToDelete, setUserToDelete] = React.useState<string | null>(null);
  const [userToEdit, setUserToEdit] = React.useState<User | null>(null);
  const [userToChangeXp, setUserToChangeXp] = React.useState<User | null>(null);
  const [userToChangeGamePoints, setUserToChangeGamePoints] = React.useState<User | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading, error } = useQuery<PaginatedUsersResponse>({
    queryKey: ["users", pagination.pageIndex, pagination.pageSize],
    queryFn: () => fetchUsers(pagination.pageIndex + 1, pagination.pageSize),
  });

  React.useEffect(() => {
    const channel = supabase
      .channel('user-management-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['users'] });
          queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
          queryClient.invalidateQueries({ queryKey: ['gameLeaderboard'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      showSuccess("User deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setUserToDelete(null);
    },
    onError: (err) => {
      showError(err.message);
      setUserToDelete(null);
    },
  });

  const handleDeleteRequest = React.useCallback((userId: string) => {
    setUserToEdit(null);
    setUserToChangeXp(null);
    setUserToChangeGamePoints(null);
    setUserToDelete(userId);
  }, []);

  const handleEditRequest = React.useCallback((user: User) => {
    setUserToDelete(null);
    setUserToChangeXp(null);
    setUserToChangeGamePoints(null);
    setUserToEdit(user);
  }, []);

  const handleChangeXpRequest = React.useCallback((user: User) => {
    setUserToDelete(null);
    setUserToEdit(null);
    setUserToChangeGamePoints(null);
    setUserToChangeXp(user);
  }, []);

  const handleChangeGamePointsRequest = React.useCallback((user: User) => {
    setUserToDelete(null);
    setUserToEdit(null);
    setUserToChangeXp(null);
    setUserToChangeGamePoints(user);
  }, []);

  const columns = React.useMemo(() => getColumns(handleDeleteRequest, handleEditRequest, handleChangeXpRequest, handleChangeGamePointsRequest), [handleDeleteRequest, handleEditRequest, handleChangeXpRequest, handleChangeGamePointsRequest]);

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
          <Button disabled className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Add User</Button>
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <AddUserDialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen} />
      <EditUserDialog open={!!userToEdit} onOpenChange={() => setUserToEdit(null)} user={userToEdit} />
      <ManualXpChangeDialog open={!!userToChangeXp} onOpenChange={() => setUserToChangeXp(null)} user={userToChangeXp} />
      <ManualGamePointsChangeDialog open={!!userToChangeGamePoints} onOpenChange={() => setUserToChangeGamePoints(null)} user={userToChangeGamePoints} />
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-vibrant-purple dark:text-vibrant-pink">User Management</h1>
          <Button onClick={() => setIsAddUserDialogOpen(true)} className="transform transition-transform-shadow duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md active:scale-95">Add User</Button>
        </div>
        <div className="overflow-x-auto">
          <DataTable
            columns={columns}
            data={data?.users || []}
            pageCount={Math.ceil((data?.totalCount || 0) / pagination.pageSize)}
            pagination={pagination}
            setPagination={setPagination}
          />
        </div>
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              and their associated data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && deleteMutation.mutate(userToDelete)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagement;