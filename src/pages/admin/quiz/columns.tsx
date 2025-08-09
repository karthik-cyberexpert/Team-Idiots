"use client"

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Play, X, Trash2, Calendar as CalendarIcon } from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { TimePicker } from "@/components/ui/time-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type QuizSetActions = {
  onShowContent: (set: QuizSet) => void;
  onUpdateStatus: (id: string, status: 'published' | 'inactive') => void;
  onUpdateDate: (id: string, date: Date) => void;
  onUpdateTime: (id: string, type: 'start_time' | 'end_time', time: string) => void;
  onUpdateReward: (id: string, type: 'gp' | 'xp', amount: number) => void;
  onDelete: (id:string) => void;
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
    accessorKey: "assign_date",
    header: "Assign Date",
    cell: ({ row }) => {
      const [isOpen, setIsOpen] = React.useState(false);
      const set = row.original;
      const date = set.assign_date ? new Date(set.assign_date) : null;

      return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
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
              onSelect={(day) => {
                if (day) actions.onUpdateDate(set.id, day);
                setIsOpen(false);
              }}
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
        <TimePicker
          value={set.start_time || ""}
          onChange={(time) => actions.onUpdateTime(set.id, 'start_time', time)}
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
        <TimePicker
          value={set.end_time || ""}
          onChange={(time) => actions.onUpdateTime(set.id, 'end_time', time)}
          disabled={set.status !== 'published'}
        />
      );
    }
  },
  {
    id: "rewards",
    header: "Rewards",
    cell: ({ row }) => {
      const set = row.original as any; // Cast to any to access new properties
      const [amount, setAmount] = React.useState(set.points_per_question || 10);

      const handleBlur = () => {
        actions.onUpdateReward(set.id, set.reward_type, amount);
      };

      return (
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            onBlur={handleBlur}
            className="w-16 h-8"
            disabled={set.status === 'published'}
          />
          <Select
            value={set.reward_type || 'gp'}
            onValueChange={(value) => actions.onUpdateReward(set.id, value as any, amount)}
            disabled={set.status === 'published'}
          >
            <SelectTrigger className="w-20 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="gp">GP</SelectItem>
              <SelectItem value="xp">XP</SelectItem>
            </SelectContent>
          </Select>
        </div>
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