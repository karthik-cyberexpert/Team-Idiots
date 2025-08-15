export type ShapeType = 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus';

export interface PlacedShape {
  id: string;
  type: ShapeType;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  color: string;
}