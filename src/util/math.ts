import { Viewport } from '@react-three/fiber';
import { Camera, Object3D, Vector2, Vector3 } from 'three';

/**
 * Utility + Math helpers
 */
export const pythag = (side: number) => Math.sqrt(side ** 2 + side ** 2);
const radConst = Math.PI / 180;
export const pointAroundCircle = (degrees: number, radius: number) =>
  new Vector2(
    radius * Math.sin(degrees * radConst),
    radius * Math.cos(degrees * radConst),
  );

export const toWorld = (object: Object3D) => {
  const vector = new Vector3();
  object.getWorldPosition(vector);
  return vector;
};

export const toScreen = (
  position: Vector3,
  camera: Camera,
  viewport: Viewport,
) => {
  const vector = position.clone();
  vector.project(camera);
  const x = (vector.x * 0.5 + 0.5) * viewport.width;
  const y = (-vector.y * 0.5 + 0.5) * viewport.height;
  return { x, y };
};

// Fast 3D distance calculation
export const distance3D = (
  x1: number,
  y1: number,
  z1: number,
  x2: number,
  y2: number,
  z2: number,
): number => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};
