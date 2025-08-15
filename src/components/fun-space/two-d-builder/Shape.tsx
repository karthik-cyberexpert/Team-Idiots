"use client";

import * as React from 'react';
import { PlacedShape, ShapeType } from '@/types/two-d-builder';
import { cn } from '@/lib/utils';

interface ShapeProps extends React.HTMLAttributes<HTMLDivElement> {
  shape: PlacedShape;
}

export const Shape = React.forwardRef<HTMLDivElement, ShapeProps>(({ shape, ...props }, ref) => {
  const getClipPath = (type: ShapeType) => {
    switch (type) {
      case 'triangle':
        return 'polygon(50% 0%, 0% 100%, 100% 100%)';
      case 'star':
        return 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)';
      case 'hexagon':
        return 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
      case 'rhombus':
        return 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)';
      case 'pentagon':
        return 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';
      case 'octagon':
        return 'polygon(25% 0%, 75% 0%, 100% 25%, 100% 75%, 75% 100%, 25% 100%, 0% 75%, 0% 25%)';
      case 'trapezoid':
        return 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)';
      default:
        return 'none';
    }
  };

  const shapeStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    width: `${shape.width}px`,
    height: `${shape.height}px`,
    backgroundColor: shape.color,
    transform: `translate(${shape.x}px, ${shape.y}px) rotate(${shape.rotation}deg)`,
    clipPath: getClipPath(shape.type),
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