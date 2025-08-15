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
  zoom: number;
}

export const BuilderCanvas = ({ shapes, setShapes, selectedShapeId, setSelectedShapeId, zoom }: BuilderCanvasProps) => {
  const [target, setTarget] = React.useState<HTMLElement | null>(null);
  const canvasContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setTarget(selectedShapeId ? document.getElementById(selectedShapeId) : null);
  }, [selectedShapeId]);

  const [, drop] = useDrop(() => ({
    accept: 'shape',
    drop: (item: { type: ShapeType; variant: 'filled' | 'outline' }, monitor) => {
      const offset = monitor.getClientOffset();
      const canvasBounds = canvasContainerRef.current?.getBoundingClientRect();
      if (!offset || !canvasBounds) return;

      const x = (offset.x - canvasBounds.left) / zoom;
      const y = (offset.y - canvasBounds.top) / zoom;

      const newShape: PlacedShape = {
        id: crypto.randomUUID(),
        type: item.type,
        variant: item.variant,
        x: x - 50, // Center the shape on the cursor
        y: y - 50,
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
      ref={drop}
      className="w-full h-full"
      onClick={() => setSelectedShapeId(null)}
    >
      <div
        ref={canvasContainerRef}
        className="w-full h-full relative canvas-content"
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
      >
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
      </div>
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
        zoom={zoom}
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
  );
};