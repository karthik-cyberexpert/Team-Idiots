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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { cn } from "@/lib/utils";

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
  const [createAsMystery, setCreateAsMystery] = React.useState(false);
  const [itemToAuction, setItemToAuction] = React.useState<AuctionItem | null>(null);
  const [itemToDelete, setItemToDelete] = React.useState<AuctionItem | null>(null);
  const [auctionToDelete, setAuctionToDelete] = React.useState<Auction | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(new Date());
  const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

  const { data, isLoading } = useQuery<AuctionData>({
    queryKey: ["auctionData"],
    queryFn: fetchAuctionData,
    refetchInterval: 1000,
  });

  const availableItems = React.useMemo(() => {
    if (!data) return [];
    const auctionedItemIds = new Set(data.auctions.map(auction => auction.item_id));
    return data.items.filter(item => !auctionedItemIds.has(item.id));
  }, [data]);

  const filteredAuctions = React.useMemo(() => {
    if (!data?.auctions) return [];
    if (!selectedDate) return data.auctions;

    const startOfSelectedDay = startOfDay(selectedDate);
    const endOfSelectedDay = endOfDay(selectedDate);

    return data.auctions.filter(auction => {
      const auctionStart = new Date(auction.start_time);
      const auctionEnd = new Date(auction.end_time);
      return auctionStart <= endOfSelectedDay && auctionEnd >= startOfSelectedDay;
    });
  }, [data?.auctions, selectedDate]);

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

  const handleOpenCreateDialog = (isMystery: boolean) => {
    setCreateAsMystery(isMystery);
    setIsCreateItemOpen(true);
  };

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
      <CreateItemDialog 
        open={isCreateItemOpen} 
        onOpenChange={setIsCreateItemOpen} 
        isMystery={createAsMystery} 
      />
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
          <div className="flex gap-2">
            <Button onClick={() => handleOpenCreateDialog(false)}>Create New Item</Button>
            <Button variant="outline" onClick={() => handleOpenCreateDialog(true)}>Create Mystery Box</Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Auction Items</CardTitle>
            <CardDescription>Manage items available for auction.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <DataTable columns={itemsColumns} data={availableItems} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Scheduled & Active Auctions</CardTitle>
                <CardDescription>Monitor and manage ongoing auctions.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Filter by date...</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setIsDatePickerOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {selectedDate && (
                  <Button variant="ghost" onClick={() => setSelectedDate(undefined)}>Clear</Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <DataTable columns={auctionsColumns} data={filteredAuctions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default AuctionManagementPage;