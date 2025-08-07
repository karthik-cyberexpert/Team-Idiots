"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Auction } from "@/types/auction";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ItemDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  auction: Auction | null;
}

export const ItemDetailsDialog = ({ open, onOpenChange, auction }: ItemDetailsDialogProps) => {
  if (!auction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{auction.auction_items.name}</DialogTitle>
          <DialogDescription>
            You won this item for {auction.current_price} GP.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="h-48 w-full rounded-md border p-4">
            <p className="text-sm text-muted-foreground">
              {auction.auction_items.description || "No description provided."}
            </p>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};