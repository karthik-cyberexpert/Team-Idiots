import * as React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Box, Circle, Cylinder, Cone, Torus } from 'lucide-react'; // Changed Sphere to Circle
import { ShapeType } from '@/types/three-d-builder';

interface ShapePaletteProps {
  onAddShape: (type: ShapeType) => void;
}

const shapes = [
  { type: 'box', label: 'Box', icon: Box },
  { type: 'sphere', label: 'Sphere', icon: Circle }, // Changed Sphere to Circle
  { type: 'cylinder', label: 'Cylinder', icon: Cylinder },
  { type: 'cone', label: 'Cone', icon: Cone },
  { type: 'torus', label: 'Torus', icon: Torus },
];

export const ShapePalette = ({ onAddShape }: ShapePaletteProps) => {
  return (
    <div className="border-b p-4">
      <h3 className="text-lg font-semibold mb-2">Shapes</h3>
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex space-x-3">
          {shapes.map((shape) => {
            const Icon = shape.icon;
            return (
              <Button
                key={shape.type}
                variant="outline"
                className="flex-shrink-0 h-20 w-20 flex flex-col items-center justify-center"
                onClick={() => onAddShape(shape.type as ShapeType)}
              >
                <Icon className="h-8 w-8 mb-1" />
                <span className="text-xs">{shape.label}</span>
              </Button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};