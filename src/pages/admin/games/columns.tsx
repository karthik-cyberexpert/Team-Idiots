"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, FileDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Game } from "@/types/game"

export const getColumns = (onDelete: (gameId: string) => void, onEdit: (game: Game) => void): ColumnDef<Game>[] => [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const description = row.getValue("description") as string;
      return <div className="line-clamp-2">{description || "N/A"}</div>;
    }
  },
  {
    accessorKey: "uploader_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Uploaded By
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
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
      const game = row.original

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
              onClick={() => navigator.clipboard.writeText(game.id)}
            >
              Copy game ID
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(game)}>
              Edit game
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(game.id)}
            >
              Delete game
            </DropdownMenuItem>
            <DropdownMenuItem>
              <a href={game.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center w-full">
                <FileDown className="h-4 w-4 mr-2" /> View File
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]