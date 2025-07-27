"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Task } from "@/types/task" // Removed CustomAward import
import { Badge } from "@/components/ui/badge"

export const getColumns = (
  onDelete: (taskId: string) => void, 
  onEdit: (task: Task) => void,
  onApprove: (taskId: string) => void,
  onReject: (taskId: string) => void
): ColumnDef<Task>[] => [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    accessorKey: "assigned_to",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Assigned To
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const task = row.original;
      return <div>{task.profiles?.full_name || "N/A"}</div>;
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Task['status'];
      const statusText = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      const variant: "default" | "secondary" | "destructive" | "outline" = 
        status === 'completed' ? 'default' 
        : status === 'pending' ? 'secondary'
        : status === 'waiting_for_approval' ? 'outline'
        : 'destructive';

      return <Badge variant={variant}>{statusText}</Badge>
    }
  },
  {
    accessorKey: "due_date",
    header: "Due Date",
    cell: ({ row }) => {
      const date = row.getValue("due_date") as string;
      return <div>{date ? new Date(date).toLocaleDateString() : 'N/A'}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const task = row.original

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
            {task.status === 'waiting_for_approval' && (
              <>
                <DropdownMenuItem onClick={() => onApprove(task.id)}>
                  <Check className="mr-2 h-4 w-4 text-green-500" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReject(task.id)}>
                  <X className="mr-2 h-4 w-4 text-red-500" />
                  Reject
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onClick={() => onEdit(task)}>
              Edit task
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(task.id)}
            >
              Delete task
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]