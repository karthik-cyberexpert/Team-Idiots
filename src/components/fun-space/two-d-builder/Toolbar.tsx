"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Camera, Trash2 } from 'lucide-react';

interface ToolbarProps {
  onReset: () => void;
  onCapture: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
}

export const Toolbar = ({ onReset, onCapture, onDeleteSelected, hasSelection }: ToolbarProps) => {
  return (
    <div className="p-4 border-t flex justify-end items-center gap-2">
      <Button variant="outline" onClick={onDeleteSelected} disabled={!hasSelection}>
        <Trash2 className="mr-2 h-4 w-4" /> Delete
      </Button>
      <Button variant="outline" onClick={onReset}>
        <RefreshCcw className="mr-2 h-4 w-4" /> Reset
      </Button>
      <Button onClick={onCapture}>
        <Camera className="mr-2 h-4 w-4" /> Capture
      </Button>
    </div>
  );
};