import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Auction, AuctionItem } from "@/types/auction";
import { getItemsColumns } from "@/components/auctions/admin/ItemsColumns";
import { getAuctionsColumns } from "@/components/auctions/admin/AuctionsColumns";
import { CreateItemDialog } from "@/components/auctions/admin/CreateItemDialog";
import { CreateAuctionDialog } from "@/components/auctions/admin/CreateAuctionDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { showSuccess, showError } from "@/utils/toast";

interface AuctionData {
  items: AuctionItem[];
  auctions: Auction[];
}

const fetchAuctionData = async (): Promise<AuctionData> => {
  const { data, error } = await supabase.functions.invoke("get-auction-data");
  if (error) throw new Error(error.message);
  return data;
};

const deleteAuctionItem = async (itemId: string) => {
  const { error } = await supabase.functions.invoke("delete-auction-item", { body: { itemId } });
  if (error) throw new Error(error.message);
};

const deleteAuction = async (auctionId: string) => {
  const { error } = await supabase.functions.invoke("delete-auction", { body: { auctionId } });
  if (error) throw new Error(error.message);
};

const AuctionManagementPage = () => {
  const queryClient = useQueryClient();
  const [isCreateItemOpen, setIsCreateItemOpen] = React.useState(false);
  const [itemToAuction, setItemToAuction] = React.useState<AuctionItem | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<AuctionItem | null>(null);
  const [auctionToDelete, setAuctionToDelete] = React.useState<Auction | null>(null);

  const { data, isLoading } = useQuery<AuctionData>({
    queryKey: ["auctionData"],
    queryFn: fetchAuctionData,
  });

  const deleteItemMutation = useMutation({
    mutationFn: deleteAuctionItem,
    onSuccess: () => {
      showSuccess("Item deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["auctionData"] });
      setItemToDelete(null);
    },
    onError: (err: Error) => {
      showError(err.message);
      setItemToDelete(null);
    },
  });

  const deleteAuctionMutation = useMutation({
    mutationFn: deleteAuction,
    onSuccess: () => {
      showSuccess("Auction deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["auctionData"] });
      setAuctionToDelete(null);
    },
    onError: (err: Error) => {
      showError(err.message);
      setAuctionToDelete(null);
    },
  });

  const itemsColumns = React.useMemo(() => getItemsColumns(setItemToAuction, setItemToDelete), []);
  const auctionsColumns = React.useMemo(() => getAuctionsColumns((auctionId) => {
    const auction = data?.auctions.find(a => a.id === auctionId);
    if (auction) setAuctionToDelete(auction);
  }), [data?.auctions]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <>
      <CreateItemDialog open={isCreateItemOpen} onOpenChange={setIsCreateItemOpen} />
      <CreateAuctionDialog open={!!itemToAuction} onOpenChange={() => setItemToAuction(null)} item={itemToAuction} />
      
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the item "{itemToDelete?.name}" and any auctions (including bids) associated with it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteItemMutation.mutate(itemToDelete!.id)} disabled={deleteItemMutation.isPending}>
              {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!auctionToDelete} onOpenChange={() => setAuctionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the auction for "{auctionToDelete?.auction_items.name}" and all its bids. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteAuctionMutation.mutate(auctionToDelete!.id)} disabled={deleteAuctionMutation.isPending}>
              {deleteAuctionMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl sm:text-3xl font-bold">Auction Management</h1>
          <Button onClick={() => setIsCreateItemOpen(true)}>Create New Item</Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Auction Items</CardTitle>
            <CardDescription>Manage items available for auction.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={itemsColumns} data={data?.items || []} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Scheduled & Active Auctions</CardTitle>
            <CardDescription>Monitor and manage ongoing auctions.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable columns={auctionsColumns} data={data?.auctions || []} />
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AuctionManagementPage;