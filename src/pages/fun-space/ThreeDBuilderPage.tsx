"use client";

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BuildingCanvas } from '@/components/fun-space/three-d-builder/BuildingCanvas';
import { ShapePalette } from '@/components/fun-space/three-d-builder/ShapePalette';
import { Toolbar } from '@/components/fun-space/three-d-builder/Toolbar';
import { PlacedShape, ShapeType } from '@/types/three-d-builder';
import { useImageCapture } from '@/hooks/use-image-capture';
import { showSuccess } from '@/utils/toast';

const getRandomColor = () => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8AA', '#FFD700', '#DA70D6', '#87CEEB'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const ThreeDBuilderPage = () => {
  const [shapes, setShapes] = React.useState<PlacedShape[]>([]);
  const [selectedShapeId, setSelectedShapeId] = React.useState<string | null>(null);
  const { canvasRef, captureAndDownload } = useImageCapture();

  const handleAddShape = (type: ShapeType) => {
    const newShape: PlacedShape = {
      id: crypto.randomUUID(),
      type,
      position: [0, 0.5, 0], // Spawn slightly above ground
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      color: getRandomColor(),
    };
    setShapes(prev => [...prev, newShape]);
    setSelectedShapeId(newShape.id); // Select the newly added shape
    showSuccess(`Added a ${type}! Drag and resize it.`);
  };

  const handleReset = () => {
    setShapes([]);
    setSelectedShapeId(null);
    showSuccess("Building reset!");
  };

  const handleCapture = () => {
    captureAndDownload({ fileName: 'my_3d_build', fileType: 'image/png' });
  };

  return (
    <div className="flex flex-col h-full">
      <Card className="flex-grow flex flex-col">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">3D Builder</CardTitle>
          <CardDescription>Drag, drop, and resize shapes to build anything you can imagine!</CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col p-0">
          <ShapePalette onAddShape={handleAddShape} />
          <div className="flex-grow relative min-h-[400px]">
            <BuildingCanvas
              shapes={shapes}
              onShapesChange={setShapes}
              selectedShapeId={selectedShapeId}
              onSelectShape={setSelectedShapeId}
              canvasRef={canvasRef}
            />
          </div>
          <Toolbar onReset={handleReset} onCapture={handleCapture} />
        </CardContent>
      </Card>
    </div>
  );
};

export default ThreeDBuilderPage;