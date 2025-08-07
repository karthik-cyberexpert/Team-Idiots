"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MyWinnings } from "./MyWinnings";

interface MyWinningsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MyWinningsDialog = ({ open, onOpenChange }: MyWinningsDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>My Winnings</DialogTitle>
          <DialogDescription>
            Prizes from auctions you've won.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <MyWinnings isDialog={true} />
        </div>
      </DialogContent>
    </Dialog>
  );
};