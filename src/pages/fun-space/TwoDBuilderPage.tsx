"use client";

import * as React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BuilderCanvas } from '@/components/fun-space/two-d-builder/BuilderCanvas';
import { ShapePalette } from '@/components/fun-space/two-d-builder/ShapePalette';
import { Toolbar } from '@/components/fun-space/two-d-builder/Toolbar';
import { PlacedShape } from '@/types/two-d-builder';
import { showSuccess, showError } from '@/utils/toast';

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
    setSelectedShapeId(null); // Deselect to hide Moveable controls before capture
    setTimeout(() => {
      if (canvasRef.current) {
        html2canvas(canvasRef.current, { backgroundColor: null }).then(canvas => {
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
    }, 100); // Small delay to allow UI to update
  };

  const handleDeleteSelected = () => {
    if (selectedShapeId) {
      setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
      setSelectedShapeId(null);
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        <Card className="flex-grow flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">2D Builder</CardTitle>
            <CardDescription>Drag shapes onto the canvas to create your masterpiece!</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col p-0">
            <ShapePalette />
            <div className="flex-grow relative min-h-[400px]">
              <BuilderCanvas
                shapes={shapes}
                setShapes={setShapes}
                selectedShapeId={selectedShapeId}
                setSelectedShapeId={setSelectedShapeId}
                canvasRef={canvasRef}
              />
            </div>
            <Toolbar
              onReset={handleReset}
              onCapture={handleCapture}
              onDeleteSelected={handleDeleteSelected}
              hasSelection={!!selectedShapeId}
            />
          </CardContent>
        </Card>
      </div>
    </DndProvider>
  );
};

export default TwoDBuilderPage;