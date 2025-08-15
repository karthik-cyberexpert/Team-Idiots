"use client";

import * as React from 'react';
import { Rnd } from 'react-rnd';
import { PlacedShape } from '@/types/two-d-builder';
import { cn } from '@/lib/utils';

interface DraggableResizableShapeProps {
  shape: PlacedShape;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, updates: Partial<PlacedShape>) => void;
}

export const DraggableResizableShape = ({ shape, isSelected, onSelect, onUpdate }: DraggableResizableShapeProps) => {
  const shapeStyle: React.CSSProperties = {
    backgroundColor: shape.color,
    transform: `rotate(${shape.rotation}deg)`,
  };

  return (
    <Rnd
      size={{ width: shape.width, height: shape.height }}
      position={{ x: shape.x, y: shape.y }}
      onDragStart={() => onSelect(shape.id)}
      onDragStop={(e, d) => onUpdate(shape.id, { x: d.x, y: d.y })}
      onResizeStart={() => onSelect(shape.id)}
      onResizeStop={(e, direction, ref, delta, position) => {
        onUpdate(shape.id, {
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          ...position,
        });
      }}
      className={cn(
        "flex items-center justify-center border-2 border-transparent",
        isSelected && "border-primary border-dashed z-10"
      )}
      bounds="parent"
    >
      <div
        className={cn(
          "w-full h-full",
          shape.type === 'circle' && 'rounded-full'
        )}
        style={shapeStyle}
        onClick={() => onSelect(shape.id)}
      />
    </Rnd>
  );
};