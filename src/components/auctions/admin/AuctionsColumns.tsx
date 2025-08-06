"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Auction } from "@/types/auction";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export const auctionsColumns: ColumnDef<Auction>[] = [
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
];