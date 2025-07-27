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
  onApprove: (task: Task) => void,
  onReject: (taskId: string) => void
): ColumnDef<Task>[] => [
  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => {
      const title = row.getValue("title") as string;
      return <div className="text-vibrant-blue dark:text-vibrant-pink">{title}</div>;
    }
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
      return <div className="text-vibrant-green dark:text-vibrant-yellow">{task.profiles?.full_name || "N/A"}</div>;
    }
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.getValue("status") as Task['status'];
      const statusText = status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      let variantClass = '';
      switch (status) {
        case 'completed':
          variantClass = 'bg-vibrant-green text-white';
          break;
        case 'pending':
          variantClass = 'bg-vibrant-orange text-white';
          break;
        case 'waiting_for_approval':
          variantClass = 'bg-vibrant-blue text-white';
          break;
        case 'rejected':
          variantClass = 'bg-vibrant-red text-white';
          break;
        default:
          variantClass = 'bg-gray-500 text-white'; // Fallback
      }

      return <Badge className={variantClass}>{statusText}</Badge>
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
                <DropdownMenuItem onClick={() => onApprove(task)}>
                  <Check className="mr-2 h-4 w-4 text-vibrant-green" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReject(task.id)}>
                  <X className="mr-2 h-4 w-4 text-vibrant-red" />
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