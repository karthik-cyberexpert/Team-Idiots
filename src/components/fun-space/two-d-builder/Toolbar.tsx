"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Camera, Trash2, ZoomIn, ZoomOut } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface ToolbarProps {
  onReset: () => void;
  onCapture: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const Toolbar = ({ onReset, onCapture, onDeleteSelected, hasSelection, zoom, onZoomChange }: ToolbarProps) => {
  return (
    <div className="p-4 border-t flex justify-between items-center gap-2">
      <div className="flex items-center gap-2 w-64">
        <Button variant="outline" size="icon" onClick={() => onZoomChange(zoom - 0.1)}><ZoomOut className="h-4 w-4" /></Button>
        <Slider value={[zoom * 100]} onValueChange={([val]) => onZoomChange(val / 100)} min={10} max={200} />
        <Button variant="outline" size="icon" onClick={() => onZoomChange(zoom + 0.1)}><ZoomIn className="h-4 w-4" /></Button>
        <div className="text-sm w-16 text-center">{Math.round(zoom * 100)}%</div>
      </div>
      <div className="flex items-center gap-2">
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
    </div>
  );
};