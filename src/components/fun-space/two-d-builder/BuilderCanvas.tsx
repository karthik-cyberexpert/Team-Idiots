"use client";

import * as React from 'react';
import { useDrop } from 'react-dnd';
import { PlacedShape, ShapeType } from '@/types/two-d-builder';
import { DraggableResizableShape } from './DraggableResizableShape';

const getRandomColor = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8AA', '#FFD700', '#DA70D6', '#87CEEB'];
  return colors[Math.floor(Math.random() * colors.length)];
};

interface BuilderCanvasProps {
  shapes: PlacedShape[];
  setShapes: React.Dispatch<React.SetStateAction<PlacedShape[]>>;
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
  canvasRef: React.RefObject<HTMLDivElement>;
}

export const BuilderCanvas = ({ shapes, setShapes, selectedShapeId, setSelectedShapeId, canvasRef }: BuilderCanvasProps) => {
  const [, drop] = useDrop(() => ({
    accept: 'shape',
    drop: (item: { type: ShapeType }, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      if (!offset || !canvasBounds) return;

      const newShape: PlacedShape = {
        id: crypto.randomUUID(),
        type: item.type,
        x: offset.x - canvasBounds.left - 50, // Center the drop
        y: offset.y - canvasBounds.top - 50,
        width: item.type === 'rectangle' ? 150 : 100,
        height: 100,
        color: getRandomColor(),
        rotation: 0,
      };
      setShapes(prev => [...prev, newShape]);
    },
  }));

  const handleUpdateShape = (id: string, updates: Partial<PlacedShape>) => {
    setShapes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  return (
    <div
      ref={canvasRef}
      className="w-full h-full bg-muted/20 relative overflow-hidden"
      onClick={() => setSelectedShapeId(null)}
    >
      <div ref={drop} className="w-full h-full">
        {shapes.map(shape => (
          <DraggableResizableShape
            key={shape.id}
            shape={shape}
            isSelected={selectedShapeId === shape.id}
            onSelect={(id) => setSelectedShapeId(id)}
            onUpdate={handleUpdateShape}
          />
        ))}
      </div>
    </div>
  );
};