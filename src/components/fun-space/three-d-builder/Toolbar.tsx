import * as React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Camera } from 'lucide-react';

interface ToolbarProps {
  onReset: () => void;
  onCapture: () => void;
}

export const Toolbar = ({ onReset, onCapture }: ToolbarProps) => {
  return (
    <div className="p-4 border-t flex justify-end space-x-2">
      <Button variant="outline" onClick={onReset}>
        <RefreshCcw className="mr-2 h-4 w-4" />
        Reset
      </Button>
      <Button onClick={onCapture}>
        <Camera className="mr-2 h-4 w-4" />
        Capture Image
      </Button>
    </div>
  );
};