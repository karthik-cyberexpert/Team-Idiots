export type ShapeType = 'square' | 'rectangle' | 'circle' | 'triangle' | 'star' | 'hexagon' | 'rhombus' | 'pentagon' | 'octagon' | 'trapezoid';

export interface PlacedShape {
  id: string;
  type: ShapeType;
  variant: 'filled' | 'outline';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
}