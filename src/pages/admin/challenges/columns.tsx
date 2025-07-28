"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Challenge } from "@/types/challenge"
import { Badge } from "@/components/ui/badge"

export const getColumns = (onDelete: (id: string) => void, onEdit: (challenge: Challenge) => void): ColumnDef<Challenge>[] => [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <div className="font-medium">{row.getValue("title")}</div>,
  },
  {
    accessorKey: "xp_reward",
    header: "XP Reward",
    cell: ({ row }) => <div className="text-vibrant-gold">{row.getValue("xp_reward")} XP</div>,
  },
  {
    accessorKey: "game_points_reward",
    header: "Game Points",
    cell: ({ row }) => <div className="text-vibrant-purple">{row.getValue("game_points_reward")} GP</div>,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => <Badge variant="outline">{row.getValue("type")}</Badge>,
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.getValue("is_active") as boolean;
      return isActive ? (
        <div className="flex items-center text-vibrant-green">
          <CheckCircle className="mr-2 h-4 w-4" /> Active
        </div>
      ) : (
        <div className="flex items-center text-vibrant-red">
          <XCircle className="mr-2 h-4 w-4" /> Inactive
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const challenge = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(challenge)}>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(challenge.id)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];