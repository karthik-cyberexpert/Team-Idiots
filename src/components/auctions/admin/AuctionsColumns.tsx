"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Auction } from "@/types/auction";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const getAuctionsColumns = (
  onDelete: (auctionId: string) => void
): ColumnDef<Auction>[] => [
  { accessorKey: "auction_items.name", header: "Item Name" },
  { 
    accessorKey: "status", 
    header: "Status",
    cell: ({ row }) => <Badge>{row.original.status}</Badge>
  },
  { 
    accessorKey: "current_price", 
    header: "Current Price (GP)" 
  },
  { 
    accessorKey: "profiles.full_name", 
    header: "Highest Bidder",
    cell: ({ row }) => row.original.profiles?.full_name || "N/A"
  },
  { 
    accessorKey: "end_time", 
    header: "End Time",
    cell: ({ row }) => format(new Date(row.original.end_time), "PPP p")
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const auction = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(auction.id)}>Delete Auction</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];