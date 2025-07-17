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

const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.functions.invoke("get-users");
  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`);
  }
  return data.users || [];
};

const deleteUser = async (userId: string) => {
  const { error } = await supabase.functions.invoke("delete-user", {
    body: { userId },
  });
  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
};

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [userToDelete, setUserToDelete] = React.useState<string | null>(null);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = React.useState(false);

  const { data: users, isLoading, error } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: fetchUsers,
  });

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
    setUserToDelete(userId);
  }, []);

  const columns = React.useMemo(() => getColumns(handleDeleteRequest), [handleDeleteRequest]);

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
          <Button disabled>Add User</Button>
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
      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold">User Management</h1>
          <Button onClick={() => setIsAddUserDialogOpen(true)}>Add User</Button>
        </div>
        <DataTable columns={columns} data={users || []} filterColumnId="email" filterPlaceholder="Filter by email..." />
      </div>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              and their associated data from our servers.
            </description>
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