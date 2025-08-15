import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid } from '@react-three/drei';
import { PlacedShape, ShapeType } from '@/types/three-d-builder';
import { DraggableShape } from './DraggableShape';

interface BuildingCanvasProps {
  shapes: PlacedShape[];
  onShapesChange: (shapes: PlacedShape[]) => void;
  selectedShapeId: string | null;
  onSelectShape: (id: string | null) => void;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}

export const BuildingCanvas = ({ shapes, onShapesChange, selectedShapeId, onSelectShape, canvasRef }: BuildingCanvasProps) => {
  const handleTransformChange = React.useCallback((
    id: string,
    newPosition: [number, number, number],
    newRotation: [number, number, number],
    newScale: [number, number, number]
  ) => {
    onShapesChange(prevShapes =>
      prevShapes.map(s =>
        s.id === id
          ? { ...s, position: newPosition, rotation: newRotation, scale: newScale }
          : s
      )
    );
  }, [onShapesChange]);

  return (
    <Canvas
      shadows
      camera={{ position: [5, 5, 5], fov: 75 }}
      className="w-full h-full bg-gray-100 dark:bg-gray-900 rounded-lg"
      onPointerMissed={() => onSelectShape(null)}
      ref={canvasRef}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-10, -10, -5]} intensity={0.5} />

      <Environment preset="sunset" background />

      <Grid
        renderOrder={-1}
        position={[0, -0.01, 0]}
        infinite
        cellSize={0.5}
        sectionSize={2}
        fadeDistance={50}
        followCamera
        args={[100, 100]}
      />

      {shapes.map(shape => (
        <DraggableShape
          key={shape.id}
          shape={shape}
          onTransformChange={handleTransformChange}
          selected={selectedShapeId === shape.id}
          onSelect={onSelectShape}
        />
      ))}

      <OrbitControls makeDefault />
    </Canvas>
  );
};