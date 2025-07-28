"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User } from "@/types/user"
import { Badge } from "@/components/ui/badge"

export const getColumns = (
  onDelete: (userId: string) => void, 
  onEdit: (user: User) => void, 
  onChangeXp: (user: User) => void,
  onChangeGamePoints: (user: User) => void
): ColumnDef<User>[] => [
  {
    accessorKey: "full_name",
    header: "Full Name",
    cell: ({ row }) => {
      const fullName = row.getValue("full_name") as string;
      return <div className="text-vibrant-blue dark:text-vibrant-pink">{fullName}</div>;
    }
  },
  {
    accessorKey: "email",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const email = row.getValue("email") as string;
      return <div className="text-vibrant-green dark:text-vibrant-yellow">{email}</div>;
    }
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => {
      const role = row.getValue("role") as string;
      return <Badge className={role === 'admin' ? 'bg-vibrant-red text-white' : 'bg-vibrant-purple text-white'}>{role}</Badge>
    }
  },
  {
    accessorKey: "xp",
    header: "XP",
    cell: ({ row }) => {
      const xp = row.getValue("xp") as number;
      return <div className="text-vibrant-gold">{xp}</div>;
    }
  },
  {
    accessorKey: "game_points",
    header: "Game Points",
    cell: ({ row }) => {
      const gamePoints = row.getValue("game_points") as number;
      return <div className="text-vibrant-purple">{gamePoints}</div>;
    }
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return <div>{date.toLocaleDateString()}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original

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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(user.id)}
            >
              Copy user ID
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(user)}>
              Edit user
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeXp(user)}>
              Change XP
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onChangeGamePoints(user)}>
              Change Game Points
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(user.id)}
            >
              Delete user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]