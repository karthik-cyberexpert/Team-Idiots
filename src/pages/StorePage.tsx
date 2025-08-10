"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { StoreItem, BoxContent, StoreSection } from "@/types/store";
import { Skeleton } from "@/components/ui/skeleton";
import { StoreItemCard } from "@/components/store/StoreItemCard";
import { PrizeRevealDialog } from "@/components/store/PrizeRevealDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { showSuccess, showError } from "@/utils/toast";
import { ShoppingCart } from "lucide-react";

interface StoreData {
  sections: StoreSection[];
  items: StoreItem[];
}

const fetchActiveStoreData = async (): Promise<StoreData> => {
  const { data: sections, error: sectionsError } = await supabase
    .from("store_sections")
    .select("*")
    .order("position", { ascending: true });
  if (sectionsError) throw new Error(sectionsError.message);

  const { data: items, error: itemsError } = await supabase
    .from("store_items")
    .select("*")
    .eq("is_active", true)
    .order("price", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);

  return { sections: sections || [], items: items || [] };
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

  const { data, isLoading } = useQuery<StoreData>({
    queryKey: ["activeStoreData"],
    queryFn: fetchActiveStoreData,
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

  const itemsBySection = React.useMemo(() => {
    if (!data) return {};
    return data.items.reduce((acc, item) => {
      const sectionId = item.section_id || 'uncategorized';
      if (!acc[sectionId]) {
        acc[sectionId] = [];
      }
      acc[sectionId].push(item);
      return acc;
    }, {} as Record<string, StoreItem[]>);
  }, [data]);

  const uncategorizedItems = itemsBySection['uncategorized'] || [];

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

      <div className="space-y-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Store</h1>
        {isLoading ? (
          <div className="space-y-8">
            <Skeleton className="h-8 w-1/3" />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          </div>
        ) : data && data.items.length > 0 ? (
          <>
            {data.sections.map(section => (
              itemsBySection[section.id] && (
                <div key={section.id} className="space-y-4">
                  <h2 className="text-xl font-semibold">{section.name}</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {itemsBySection[section.id].map(item => (
                      <StoreItemCard
                        key={item.id}
                        item={item}
                        onPurchase={setItemToConfirm}
                        isPurchasing={purchaseMutation.isPending && purchaseMutation.variables === item.id}
                        userGp={profile?.game_points || 0}
                      />
                    ))}
                  </div>
                </div>
              )
            ))}
            {uncategorizedItems.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Other Items</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {uncategorizedItems.map(item => (
                    <StoreItemCard
                      key={item.id}
                      item={item}
                      onPurchase={setItemToConfirm}
                      isPurchasing={purchaseMutation.isPending && purchaseMutation.variables === item.id}
                      userGp={profile?.game_points || 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
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