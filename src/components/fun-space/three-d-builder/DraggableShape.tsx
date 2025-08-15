import * as React from 'react';
import { MeshProps, useThree } from '@react-three/fiber';
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
  const meshRef = React.useRef<Mesh>(null);
  const controlsRef = React.useRef<any>(null); // Ref for TransformControls
  const { camera, gl } = useThree();

  React.useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.enabled = selected;
      if (selected) {
        controlsRef.current.attach(meshRef.current);
      } else {
        controlsRef.current.detach();
      }
    }
  }, [selected]);

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

  const handlePointerDown = React.useCallback((event: any) => {
    event.stopPropagation(); // Prevent canvas click from deselecting
    onSelect(shape.id);
  }, [shape.id, onSelect]);

  const geometryProps = { args: [1, 1, 1] }; // Default args for box, sphere, cylinder, cone, torus

  switch (shape.type) {
    case 'box':
      geometryProps.args = [1, 1, 1];
      break;
    case 'sphere':
      geometryProps.args = [0.5, 32, 32]; // radius, widthSegments, heightSegments
      break;
    case 'cylinder':
      geometryProps.args = [0.5, 0.5, 1, 32]; // radiusTop, radiusBottom, height, radialSegments
      break;
    case 'cone':
      geometryProps.args = [0.5, 1, 32]; // radius, height, radialSegments
      break;
    case 'torus':
      geometryProps.args = [0.4, 0.1, 16, 32]; // radius, tube, radialSegments, tubularSegments
      break;
  }

  const GeometryComponent = React.useMemo(() => {
    switch (shape.type) {
      case 'box': return <boxGeometry {...geometryProps} />;
      case 'sphere': return <sphereGeometry {...geometryProps} />;
      case 'cylinder': return <cylinderGeometry {...geometryProps} />;
      case 'cone': return <coneGeometry {...geometryProps} />;
      case 'torus': return <torusGeometry {...geometryProps} />;
      default: return <boxGeometry {...geometryProps} />;
    }
  }, [shape.type, geometryProps]);

  return (
    <>
      <mesh
        ref={meshRef}
        position={shape.position}
        rotation={shape.rotation}
        scale={shape.scale}
        onClick={handlePointerDown}
        onPointerMissed={() => onSelect(null)} // Deselect if clicking outside
        {...props}
      >
        {GeometryComponent}
        <meshStandardMaterial color={shape.color} />
      </mesh>
      {selected && (
        <TransformControls
          ref={controlsRef}
          mode="translate"
          onMouseUp={handleTransformEnd}
          onDraggingChanged={(isDragging) => {
            if (gl && gl.domElement && gl.domElement.style) {
              gl.domElement.style.cursor = isDragging ? 'grabbing' : 'grab';
            }
          }}
        />
      )}
    </>
  );
};