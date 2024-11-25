import { Tile } from '@/store/gameStore';
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

export const deg2Rad = (degrees: number) => degrees * (Math.PI / 180);

interface SpatialHash {
  [key: string]: string[];
}

const CELL_SIZE = 0.25;
const PROXIMITY_THRESHOLD = 0.1; // Distance threshold for nearby spheres

// Helper function to get cell coordinates for a position
const getCellCoords = ([x, y, z]: [number, number, number]): string => {
  const xs = Math.round(x / CELL_SIZE) * CELL_SIZE;
  const ys = Math.round(y / CELL_SIZE) * CELL_SIZE;
  const zs = Math.round(z / CELL_SIZE) * CELL_SIZE;
  return `${xs},${ys},${zs}`;
};

export type TileExit = {
  tileId: string;
  position: [number, number, number];
  entranceIndex: number;
};
export const calculateExitBuddies = (tileExits: TileExit[]) => {
  const tes = tileExits.reduce<Record<string, TileExit[]>>((acc, te) => {
    const coords = getCellCoords(te.position);
    return {
      ...acc,
      [coords]: (acc[coords] || []).concat(te),
    };
  }, {});
  const groups = Object.values(tes);

  const buddies = groups.reduce<
    Record<string, { tileId: string; entranceIndex: number }[]>
  >((acc, [a, b]) => {
    if (b) {
      acc[a.tileId] = acc[a.tileId] || [];
      acc[a.tileId][a.entranceIndex] = b;

      acc[b.tileId] = acc[b.tileId] || [];
      acc[b.tileId][b.entranceIndex] = a;
    }
    return acc;
  }, {});

  return [buddies, groups] as const;
};
