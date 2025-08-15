import * as React from 'react';
import { MeshProps } from '@react-three/fiber';
import { TransformControls } from '@react-three/drei';
import { PlacedShape } from '@/types/three-d-builder';
import { Mesh } from 'three';

interface DraggableShapeProps extends MeshProps {
  shape: PlacedShape;
  onTransformChange: (id: string, position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => void;
  selected: boolean;
  onSelect: (id: string | null) => void;
}

export const DraggableShape = ({ shape, onTransformChange, selected, onSelect, ...props }: DraggableShapeProps) => {
  const meshRef = React.useRef<Mesh>(null!);

  const handleTransformEnd = React.useCallback(() => {
    if (meshRef.current) {
      const { position, rotation, scale } = meshRef.current;
      onTransformChange(
        shape.id,
        [position.x, position.y, position.z],
        [rotation.x, rotation.y, rotation.z],
        [scale.x, scale.y, scale.z]
      );
    }
  }, [shape.id, onTransformChange]);

  const handleClick = React.useCallback((event: any) => {
    event.stopPropagation();
    onSelect(shape.id);
  }, [shape.id, onSelect]);

  const GeometryComponent = React.useMemo(() => {
    switch (shape.type) {
      case 'box': return <boxGeometry args={[1, 1, 1]} />;
      case 'sphere': return <sphereGeometry args={[0.5, 32, 32]} />;
      case 'cylinder': return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case 'cone': return <coneGeometry args={[0.5, 1, 32]} />;
      case 'torus': return <torusGeometry args={[0.4, 0.1, 16, 32]} />;
      default: return <boxGeometry args={[1, 1, 1]} />;
    }
  }, [shape.type]);

  return (
    <>
      <mesh
        ref={meshRef}
        position={shape.position}
        rotation={shape.rotation}
        scale={shape.scale}
        onClick={handleClick}
        {...props}
      >
        {GeometryComponent}
        <meshStandardMaterial color={shape.color} />
      </mesh>
      {selected && (
        <TransformControls
          object={meshRef}
          mode="translate"
          onMouseUp={handleTransformEnd}
        />
      )}
    </>
  );
};