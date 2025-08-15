"use client";

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Camera, RotateCw, Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';

interface ToolbarProps {
  onReset: () => void;
  onCapture: () => void;
  onDeleteSelected: () => void;
  onRotateSelected: (rotation: number) => void;
  selectedShapeRotation: number;
  hasSelection: boolean;
}

export const Toolbar = ({ onReset, onCapture, onDeleteSelected, onRotateSelected, selectedShapeRotation, hasSelection }: ToolbarProps) => {
  return (
    <div className="p-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-4 w-full sm:w-auto">
        <Label htmlFor="rotation-slider" className="whitespace-nowrap">Rotate</Label>
        <Slider
          id="rotation-slider"
          min={0}
          max={360}
          step={1}
          value={[selectedShapeRotation]}
          onValueChange={(value) => onRotateSelected(value[0])}
          disabled={!hasSelection}
          className="w-full sm:w-48"
        />
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