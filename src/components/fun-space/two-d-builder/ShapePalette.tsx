"use client";

import * as React from 'react';
import { useDrag } from 'react-d-nd';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
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
      className="flex-shrink-0 h-20 w-20 flex flex-col items-center justify-center border rounded-md bg-card hover:bg-accent hover:text-accent-foreground cursor-grab"
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </div>
  );
};

export const ShapePalette = () => {
  const shapes: Omit<PaletteShapeProps, 'variant'>[] = [
    { type: 'square', label: 'Square', icon: <Square className="h-8 w-8" /> },
    { type: 'rectangle', label: 'Rectangle', icon: <RectangleHorizontal className="h-8 w-8" /> },
    { type: 'circle', label: 'Circle', icon: <Circle className="h-8 w-8" /> },
    { type: 'triangle', label: 'Triangle', icon: <Triangle className="h-8 w-8" /> },
    { type: 'star', label: 'Star', icon: <Star className="h-8 w-8" /> },
    { type: 'hexagon', label: 'Hexagon', icon: <Hexagon className="h-8 w-8" /> },
    { type: 'rhombus', label: 'Rhombus', icon: <Diamond className="h-8 w-8" /> },
    { type: 'pentagon', label: 'Pentagon', icon: <Pentagon className="h-8 w-8" /> },
    { type: 'octagon', label: 'Octagon', icon: <Octagon className="h-8 w-8" /> },
    { type: 'trapezoid', label: 'Trapezoid', icon: <RectangleHorizontal className="h-8 w-8" /> },
  ];

  return (
    <div className="border-b p-4">
      <h3 className="text-lg font-semibold mb-2">Filled Shapes</h3>
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex space-x-3">
          {shapes.map((shape) => (
            <PaletteShape key={shape.type} {...shape} variant="filled" />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
      <h3 className="text-lg font-semibold my-2">Outline Shapes</h3>
      <ScrollArea className="w-full whitespace-nowrap pb-4">
        <div className="flex space-x-3">
          {shapes.map((shape) => (
            <PaletteShape key={`${shape.type}-outline`} {...shape} variant="outline" icon={React.cloneElement(shape.icon as React.ReactElement, { fill: 'none', stroke: 'currentColor' })} />
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};