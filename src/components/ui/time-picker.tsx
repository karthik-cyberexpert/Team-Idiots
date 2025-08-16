"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface TimePickerProps {
  value?: string; // "HH:mm"
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export const TimePicker = ({ value, onChange, disabled, className }: TimePickerProps) => {
  const [hour, minute] = value?.split(":") || ["", ""];

  const handleHourChange = (newHour: string) => {
    onChange(`${newHour}:${minute || '00'}`);
  };

  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hour || '00'}:${newMinute}`);
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className={cn("flex gap-2 items-center p-2 border rounded-md bg-transparent", className)}>
      <Clock className="h-4 w-4 text-muted-foreground" />
      <Select value={hour} onValueChange={handleHourChange} disabled={disabled}>
        <SelectTrigger className="w-[70px] border-0 focus:ring-0">
          <SelectValue placeholder="HH" />
        </SelectTrigger>
        <SelectContent>
          {hours.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select value={minute} onValueChange={handleMinuteChange} disabled={disabled}>
        <SelectTrigger className="w-[70px] border-0 focus:ring-0">
          <SelectValue placeholder="MM" />
        </SelectTrigger>
        <SelectContent>
          {minutes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
};