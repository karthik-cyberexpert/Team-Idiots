"use client";

import * as React from 'react';
import { PlacedShape } from '@/types/two-d-builder';

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
    transform: `translate(${shape.x}px, ${shape.y}px) rotate(${shape.rotation}deg)`,
  };

  const svgProps = {
    fill: shape.variant === 'filled' ? shape.color : 'none',
    stroke: shape.variant === 'outline' ? shape.color : 'none',
    strokeWidth: shape.variant === 'outline' ? 4 : 0,
  };

  const renderSvgShape = () => {
    switch (shape.type) {
      case 'square':
      case 'rectangle':
        return <rect x="0" y="0" width="100" height="100" {...svgProps} />;
      case 'circle':
        return <circle cx="50" cy="50" r="50" {...svgProps} />;
      case 'triangle':
        return <polygon points="50,0 0,100 100,100" {...svgProps} />;
      case 'star':
        return <polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35" {...svgProps} />;
      case 'hexagon':
        return <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" {...svgProps} />;
      case 'rhombus':
        return <polygon points="50,0 100,50 50,100 0,50" {...svgProps} />;
      case 'pentagon':
        return <polygon points="50,0 100,38 82,100 18,100 0,38" {...svgProps} />;
      case 'octagon':
        return <polygon points="29.3,0 70.7,0 100,29.3 100,70.7 70.7,100 29.3,100 0,70.7 0,29.3" {...svgProps} />;
      case 'trapezoid':
        return <polygon points="20,0 80,0 100,100 0,100" {...svgProps} />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={ref}
      id={shape.id}
      className="select-none"
      style={shapeStyle}
      {...props}
    >
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {renderSvgShape()}
      </svg>
    </div>
  );
});