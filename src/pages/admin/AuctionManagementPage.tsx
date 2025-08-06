import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Auction, AuctionItem } from "@/types/auction";
import { getItemsColumns } from "@/components/auctions/admin/ItemsColumns";
import { auctionsColumns } from "@/components/auctions/admin/AuctionsColumns";
import { CreateItemDialog } from "@/components/auctions/admin/CreateItemDialog";
import { CreateAuctionDialog } from "@/components/auctions/admin/CreateAuctionDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface AuctionData {
  items: AuctionItem[];
  auctions: Auction[];
}

const fetchAuctionData = async (): Promise<AuctionData> => {
  const { data, error } = await supabase.functions.invoke("get-auction-data");
  if (error) throw new Error(error.message);
  return data;
};

const AuctionManagementPage = () => {
  const [isCreateItemOpen, setIsCreateItemOpen] = React.useState(false);
  const [itemToAuction, setItemToAuction] = React.useState<AuctionItem | null>(null);

  const { data, isLoading } = useQuery<AuctionData>({
    queryKey: ["auctionData"],
    queryFn: fetchAuctionData,
  });

  const itemsColumns = React.useMemo(() => getItemsColumns(setItemToAuction), []);

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <>
      <CreateItemDialog open={isCreateItemOpen} onOpenChange={setIsCreateItemOpen} />
      <CreateAuctionDialog open={!!itemToAuction} onOpenChange={() => setItemToAuction(null)} item={itemToAuction} />
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