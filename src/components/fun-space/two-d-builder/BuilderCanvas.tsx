"use client";

import * as React from 'react';
import { useDrop } from 'react-dnd';
import Moveable from 'react-moveable';
import { PlacedShape, ShapeType } from '@/types/two-d-builder';
import { Shape } from './Shape';

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
  const [target, setTarget] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setTarget(selectedShapeId ? document.getElementById(selectedShapeId) : null);
  }, [selectedShapeId]);

  const [, drop] = useDrop(() => ({
    accept: 'shape',
    drop: (item: { type: ShapeType }, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasBounds = canvasRef.current?.getBoundingClientRect();
      if (!offset || !canvasBounds) return;

      const newShape: PlacedShape = {
        id: crypto.randomUUID(),
        type: item.type,
        x: offset.x - canvasBounds.left - 50,
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
          <Shape
            key={shape.id}
            shape={shape}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedShapeId(shape.id);
            }}
          />
        ))}
        <Moveable
          target={target}
          draggable={true}
          resizable={true}
          rotatable={true}
          keepRatio={false}
          throttleResize={1}
          throttleRotate={0}
          renderDirections={["nw", "n", "ne", "w", "e", "sw", "s", "se"]}
          edge={false}
          zoom={1}
          origin={true}
          padding={{ "left": 0, "top": 0, "right": 0, "bottom": 0 }}
          onDrag={e => {
            e.target.style.transform = e.transform;
          }}
          onResize={e => {
            e.target.style.width = `${e.width}px`;
            e.target.style.height = `${e.height}px`;
            e.target.style.transform = e.drag.transform;
          }}
          onRotate={e => {
            e.target.style.transform = e.drag.transform;
          }}
          onRenderEnd={e => {
            if (!e.target.id) return;
            const matrix = new DOMMatrix(e.target.style.transform);
            const newRotation = Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
            handleUpdateShape(e.target.id, {
              x: matrix.e,
              y: matrix.f,
              width: e.target.offsetWidth,
              height: e.target.offsetHeight,
              rotation: newRotation,
            });
          }}
        />
      </div>
    </div>
  );
};