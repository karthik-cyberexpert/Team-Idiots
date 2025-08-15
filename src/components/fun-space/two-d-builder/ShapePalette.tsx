"use client";

import * as React from 'react';
import { useDrag } from 'react-dnd';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Square, RectangleHorizontal, Circle, Triangle, Star, Hexagon, Diamond, Pentagon, Octagon } from 'lucide-react';
import { ShapeType } from '@/types/two-d-builder';

interface PaletteShapeProps {
  type: ShapeType;
  variant: 'filled' | 'outline';
  label: string;
  icon: React.ReactNode;
}

const PaletteShape = ({ type, variant, label, icon }: PaletteShapeProps) => {
  const [, drag] = useDrag(() => ({
    type: 'shape',
    item: { type, variant },
  }));

  return (
    <div
      ref={drag}
      className="flex flex-col items-center justify-center p-2 border rounded-md bg-card hover:bg-accent hover:text-accent-foreground cursor-grab aspect-square"
    >
      {icon}
      <span className="text-xs mt-1 text-center">{label}</span>
    </div>
  );
};

export const ShapePalette = () => {
  const shapes: Omit<PaletteShapeProps, 'variant'>[] = [
    { type: 'square', label: 'Square', icon: <Square className="h-6 w-6" /> },
    { type: 'rectangle', label: 'Rectangle', icon: <RectangleHorizontal className="h-6 w-6" /> },
    { type: 'circle', label: 'Circle', icon: <Circle className="h-6 w-6" /> },
    { type: 'triangle', label: 'Triangle', icon: <Triangle className="h-6 w-6" /> },
    { type: 'star', label: 'Star', icon: <Star className="h-6 w-6" /> },
    { type: 'hexagon', label: 'Hexagon', icon: <Hexagon className="h-6 w-6" /> },
    { type: 'rhombus', label: 'Rhombus', icon: <Diamond className="h-6 w-6" /> },
    { type: 'pentagon', label: 'Pentagon', icon: <Pentagon className="h-6 w-6" /> },
    { type: 'octagon', label: 'Octagon', icon: <Octagon className="h-6 w-6" /> },
    { type: 'trapezoid', label: 'Trapezoid', icon: <RectangleHorizontal className="h-6 w-6" /> },
  ];

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Filled Shapes</h3>
          <div className="grid grid-cols-2 gap-2">
            {shapes.map((shape) => (
              <PaletteShape key={shape.type} {...shape} variant="filled" />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Outline Shapes</h3>
          <div className="grid grid-cols-2 gap-2">
            {shapes.map((shape) => (
              <PaletteShape key={`${shape.type}-outline`} {...shape} variant="outline" icon={React.cloneElement(shape.icon as React.ReactElement, { fill: 'none', stroke: 'currentColor' })} />
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};