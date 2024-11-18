import { Vector2 } from 'three';

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
