"use client";

import * as React from 'react';
import { PlacedShape } from '@/types/two-d-builder';
import { cn } from '@/lib/utils';

interface ShapeProps extends React.HTMLAttributes<HTMLDivElement> {
  shape: PlacedShape;
}

export const Shape = React.forwardRef<HTMLDivElement, ShapeProps>(({ shape, ...props }, ref) => {
  const shapeStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: `${shape.width}px`,
    height: `${shape.height}px`,
    backgroundColor: shape.color,
    transform: `translate(${shape.x}px, ${shape.y}px) rotate(${shape.rotation}deg)`,
  };

  return (
    <div
      ref={ref}
      id={shape.id}
      className={cn(
        "select-none",
        shape.type === 'circle' && 'rounded-full'
      )}
      style={shapeStyle}
      {...props}
    />
  );
});