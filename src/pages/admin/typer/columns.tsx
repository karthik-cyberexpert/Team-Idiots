"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, Check, X, Play, Calendar as CalendarIcon, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TyperSet } from "@/types/typer"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"

type TyperSetActions = {
  onShowContent: (set: TyperSet) => void;
  onUpdateStatus: (id: string, status: 'published' | 'inactive') => void;
  onUpdateDate: (id: string, date: Date) => void;
  onDelete: (id:string) => void;
}

export const getColumns = (actions: TyperSetActions): ColumnDef<TyperSet>[] => [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    id: "content",
    header: "Content Preview",
    cell: ({ row }) => (
      <Button variant="outline" size="sm" onClick={() => actions.onShowContent(row.original)}>
        Show Content
      </Button>
    )
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Created At <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => new Date(row.getValue("created_at")).toLocaleString()
  },
  {
    accessorKey: "assign_date",
    header: "Assign Date",
    cell: ({ row }) => {
      const set = row.original;
      const date = set.assign_date ? new Date(set.assign_date) : null;

      return (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" disabled={set.status !== 'published'}>
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Set Date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date || undefined}
              onSelect={(day) => day && actions.onUpdateDate(set.id, day)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      );
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      const variant = status === 'published' ? 'default' : status === 'draft' ? 'secondary' : 'destructive';
      return <Badge variant={variant}>{status}</Badge>;
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const set = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {set.status === 'draft' && (
              <DropdownMenuItem onClick={() => actions.onUpdateStatus(set.id, 'published')}>
                <Play className="mr-2 h-4 w-4" /> Publish
              </DropdownMenuItem>
            )}
            {set.status === 'published' && (
              <DropdownMenuItem onClick={() => actions.onUpdateStatus(set.id, 'inactive')}>
                <X className="mr-2 h-4 w-4" /> Make Inactive
              </DropdownMenuItem>
            )}
            {set.status !== 'published' && (
              <DropdownMenuItem className="text-destructive" onClick={() => actions.onDelete(set.id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
]