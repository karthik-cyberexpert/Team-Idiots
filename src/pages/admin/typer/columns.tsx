"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, Check, X, Play, Calendar as CalendarIcon, Trash2, Clock } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { format } from "date-fns"

type TyperSetActions = {
  onShowContent: (set: TyperSet) => void;
  onUpdateStatus: (id: string, status: 'published' | 'inactive') => void;
  onUpdateDate: (id: string, date: Date) => void;
  onUpdateTime: (id: string, type: 'start_time' | 'end_time', time: string) => void;
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
    accessorKey: "start_time",
    header: "Start Time",
    cell: ({ row }) => {
      const set = row.original;
      return (
        <Input
          type="time"
          defaultValue={set.start_time || ""}
          onBlur={(e) => actions.onUpdateTime(set.id, 'start_time', e.target.value)}
          className="w-32"
          disabled={set.status !== 'published'}
        />
      );
    }
  },
  {
    accessorKey: "end_time",
    header: "End Time",
    cell: ({ row }) => {
      const set = row.original;
      return (
        <Input
          type="time"
          defaultValue={set.end_time || ""}
          onBlur={(e) => actions.onUpdateTime(set.id, 'end_time', e.target.value)}
          className="w-32"
          disabled={set.status !== 'published'}
        />
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