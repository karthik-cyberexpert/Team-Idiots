export type ShapeType = 'square' | 'rectangle' | 'circle';

export interface PlacedShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
}