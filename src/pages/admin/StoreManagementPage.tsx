"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreItem, StoreSection } from "@/types/store";
import { CreateEditItemDialog } from "./store/CreateEditItemDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { showSuccess, showError } from "@/utils/toast";
import { SectionManager } from "./store/SectionManager";
import { ItemReorderManager } from "./store/ItemReorderManager";

interface StoreManagementData {
  items: StoreItem[];
  sections: StoreSection[];
}

const fetchStoreManagementData = async (): Promise<StoreManagementData> => {
  const { data, error } = await supabase.functions.invoke("get-store-management-data");
  if (error) throw new Error(error.message);
  return data;
};

const StoreManagementPage = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [itemToEdit, setItemToEdit] = React.useState<StoreItem | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<StoreItem | null>(null);

  const { data, isLoading } = useQuery<StoreManagementData>({
    queryKey: ["storeManagementData"],
    queryFn: fetchStoreManagementData,
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: StoreItem) => {
      const { error } = await supabase.functions.invoke("delete-store-item", { body: { id: item.id } });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      showSuccess("Item deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["storeManagementData"] });
      setItemToDelete(null);
    },
    onError: (err: Error) => {
      showError(err.message);
      setItemToDelete(null);
    },
  });

  const handleCreate = () => {
    setItemToEdit(null);
    setDialogOpen(true);
  };

  const handleEdit = (item: StoreItem) => {
    setItemToEdit(item);
    setDialogOpen(true);
  };

  return (
    <>
      <CreateEditItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={itemToEdit}
        sections={data?.sections || []}
      />
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the item "{itemToDelete?.name}".</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(itemToDelete!)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Store Management</h1>
          <Button onClick={handleCreate}>Create New Item</Button>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {isLoading ? (
              <Skeleton className="h-96 w-full" />
            ) : (
              <ItemReorderManager
                sections={data?.sections || []}
                items={data?.items || []}
                onEdit={handleEdit}
                onDelete={setItemToDelete}
              />
            )}
          </div>
          <div className="space-y-6">
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <SectionManager sections={data?.sections || []} />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default StoreManagementPage;