"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { StoreItem, BoxContent } from "@/types/store";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreItemCard } from "@/components/store/StoreItemCard";
import { PrizeRevealDialog } from "@/components/store/PrizeRevealDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { showSuccess, showError } from "@/utils/toast";
import { ShoppingCart } from "lucide-react";

const fetchActiveStoreItems = async (): Promise<StoreItem[]> => {
  const { data, error } = await supabase
    .from("store_items")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (error) throw new Error(error.message);
  return data;
};

const purchaseItem = async (itemId: string): Promise<{ message: string; prize: BoxContent | null }> => {
  const { data, error } = await supabase.functions.invoke("purchase-store-item", {
    body: { itemId },
  });
  if (error) throw new Error(error.message);
  return data;
};

const StorePage = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const [itemToConfirm, setItemToConfirm] = React.useState<StoreItem | null>(null);
  const [revealedPrize, setRevealedPrize] = React.useState<BoxContent | null>(null);

  const { data: items, isLoading } = useQuery<StoreItem[]>({
    queryKey: ["activeStoreItems"],
    queryFn: fetchActiveStoreItems,
  });

  const purchaseMutation = useMutation({
    mutationFn: (itemId: string) => purchaseItem(itemId),
    onSuccess: (data) => {
      showSuccess(data.message);
      if (data.prize) {
        setRevealedPrize(data.prize);
      }
      queryClient.invalidateQueries({ queryKey: ["myPowerUps"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["xpHistory"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["gameLeaderboard"] });
    },
    onError: (err: Error) => showError(err.message),
    onSettled: () => setItemToConfirm(null),
  });

  return (
    <>
      <AlertDialog open={!!itemToConfirm} onOpenChange={() => setItemToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Purchase</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to buy "{itemToConfirm?.name}" for {itemToConfirm?.price} GP?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => purchaseMutation.mutate(itemToConfirm!.id)} disabled={purchaseMutation.isPending}>
              {purchaseMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PrizeRevealDialog
        open={!!revealedPrize}
        onOpenChange={() => setRevealedPrize(null)}
        prize={revealedPrize}
      />

      <div className="space-y-6">
        <h1 className="text-2xl sm:text-3xl font-bold">Store</h1>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : items && items.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {items.map(item => (
              <StoreItemCard
                key={item.id}
                item={item}
                onPurchase={setItemToConfirm}
                isPurchasing={purchaseMutation.isPending && purchaseMutation.variables === item.id}
                userGp={profile?.game_points || 0}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            <ShoppingCart className="mx-auto h-12 w-12 mb-4" />
            <p>The store is currently empty. Check back soon!</p>
          </div>
        )}
      </div>
    </>
  );
};

export default StorePage;