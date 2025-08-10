"use client"

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Play, X, Trash2, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { QuizSet } from "@/types/quiz"
import { Badge } from "@/components/ui/badge"

type QuizSetActions = {
  onShowContent: (set: QuizSet) => void;
  onUpdateStatus: (id: string, status: 'published' | 'inactive') => void;
  onDelete: (id:string) => void;
  onEdit: (set: QuizSet) => void;
}

export const getColumns = (actions: QuizSetActions): ColumnDef<QuizSet>[] => [
  {
    accessorKey: "title",
    header: "Title",
  },
  {
    id: "content",
    header: "Questions",
    cell: ({ row }) => (
      <Button variant="outline" size="sm" onClick={() => actions.onShowContent(row.original)}>
        Show Questions
      </Button>
    )
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
            <DropdownMenuItem onClick={() => actions.onEdit(set)}>
              <Edit className="mr-2 h-4 w-4" /> Edit Settings
            </DropdownMenuItem>
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
            {set.status === 'inactive' && (
              <DropdownMenuItem onClick={() => actions.onUpdateStatus(set.id, 'published')}>
                <Play className="mr-2 h-4 w-4" /> Republish
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