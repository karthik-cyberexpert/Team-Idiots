"use client";

import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { BuilderCanvas } from '@/components/fun-space/two-d-builder/BuilderCanvas';
import { ShapePalette } from '@/components/fun-space/two-d-builder/ShapePalette';
import { Toolbar } from '@/components/fun-space/two-d-builder/Toolbar';
import { PlacedShape } from '@/types/two-d-builder';
import { showSuccess, showError } from '@/utils/toast';

const TwoDBuilderPage = () => {
  const [shapes, setShapes] = React.useState<PlacedShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const handleReset = () => {
    setShapes([]);
    setSelectedShapeId(null);
    setZoom(1);
    showSuccess("Canvas reset!");
  };

  const handleCapture = () => {
    setSelectedShapeId(null);
    setTimeout(() => {
      if (canvasRef.current) {
        const canvasContent = canvasRef.current.querySelector('.canvas-content') as HTMLElement;
        if (canvasContent) {
          html2canvas(canvasContent, { backgroundColor: null, scale: 1 }).then(canvas => {
            canvas.toBlob(blob => {
              if (blob) {
                saveAs(blob, '2d-creation.png');
                showSuccess("Image captured!");
              } else {
                showError("Failed to capture image.");
              }
            });
          });
        }
      }
    }, 100);
  };

  const handleDeleteSelected = () => {
    if (selectedShapeId) {
      setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
      setSelectedShapeId(null);
    }
  };

  const handleZoomChange = (newZoom: number) => {
    setZoom(Math.max(0.1, Math.min(newZoom, 2))); // Clamp zoom between 10% and 200%
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full border rounded-lg bg-card text-card-foreground shadow-sm">
        <div className="p-4 border-b">
          <h1 className="text-2xl font-bold">2D Builder</h1>
          <p className="text-muted-foreground">Drag shapes onto the canvas to create your masterpiece!</p>
        </div>
        <ShapePalette />
        <div className="flex-grow relative overflow-hidden" ref={canvasRef}>
          <BuilderCanvas
            shapes={shapes}
            setShapes={setShapes}
            selectedShapeId={selectedShapeId}
            setSelectedShapeId={setSelectedShapeId}
            zoom={zoom}
          />
        </div>
        <Toolbar
          onReset={handleReset}
          onCapture={handleCapture}
          onDeleteSelected={handleDeleteSelected}
          hasSelection={!!selectedShapeId}
          zoom={zoom}
          onZoomChange={handleZoomChange}
        />
      </div>
    </DndProvider>
  );
};

export default TwoDBuilderPage;