"use client";

import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { BuilderCanvas } from '@/components/fun-space/two-d-builder/BuilderCanvas';
import { ShapePalette } from '@/components/fun-space/two-d-builder/ShapePalette';
import { PlacedShape } from '@/types/two-d-builder';
import { showSuccess, showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { RefreshCcw, Camera, Trash2 } from 'lucide-react';

const TwoDBuilderPage = () => {
  const [shapes, setShapes] = React.useState<PlacedShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = React.useState<string | null>(null);
  const canvasRef = React.useRef<HTMLDivElement>(null);

  const handleReset = () => {
    setShapes([]);
    setSelectedShapeId(null);
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

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-full border rounded-lg bg-card text-card-foreground shadow-sm overflow-hidden">
        {/* Left Panel: Palette */}
        <div className="w-64 border-r flex flex-col flex-shrink-0">
          <div className="p-4 border-b">
            <h1 className="text-xl font-bold">2D Builder</h1>
            <p className="text-sm text-muted-foreground">Drag shapes to the canvas.</p>
          </div>
          <ShapePalette />
        </div>

        {/* Right Panel: Canvas + Toolbar */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex justify-end items-center gap-2 flex-shrink-0">
            <Button variant="outline" onClick={handleDeleteSelected} disabled={!selectedShapeId}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
            <Button variant="outline" onClick={handleReset}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Reset
            </Button>
            <Button onClick={handleCapture}>
              <Camera className="mr-2 h-4 w-4" /> Capture
            </Button>
          </div>
          <div className="flex-grow relative overflow-auto" ref={canvasRef}>
            <BuilderCanvas
              shapes={shapes}
              setShapes={setShapes}
              selectedShapeId={selectedShapeId}
              setSelectedShapeId={setSelectedShapeId}
            />
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default TwoDBuilderPage;