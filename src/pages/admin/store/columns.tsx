"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { StoreItem } from "@/types/store";

type StoreItemActions = {
  onEdit: (item: StoreItem) => void;
  onDelete: (item: StoreItem) => void;
  onToggleActive: (item: StoreItem, isActive: boolean) => void;
};

export const getColumns = (actions: StoreItemActions): ColumnDef<StoreItem>[] => [
  { accessorKey: "name", header: "Name" },
  {
    accessorKey: "item_type",
    header: "Type",
    cell: ({ row }) => <Badge variant="secondary">{row.original.item_type.replace('_', ' ')}</Badge>,
  },
  { accessorKey: "price", header: "Price (GP)" },
  {
    accessorKey: "is_active",
    header: "Active",
    cell: ({ row }) => (
      <Switch
        checked={row.original.is_active}
        onCheckedChange={(value) => actions.onToggleActive(row.original, value)}
      />
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => actions.onEdit(item)}>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => actions.onDelete(item)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];