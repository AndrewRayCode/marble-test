import {
  JunctionTile,
  RailTile,
  TileComputed,
  Transform,
  isJunctionTile,
  isRailTile,
} from '@/store/gameStore';
import { useMemo } from 'react';
import {
  CatmullRomCurve3,
  CubicBezierCurve3,
  Euler,
  Matrix4,
  Vector3,
} from 'three';
import { INITIAL_SPHERE_RADIUS, TILE_HALF_WIDTH } from '../game/constants';
import { pointAroundCircle } from '@/util/math';

/**
 * With a camera at the positive 6 position:
 * -x is left, +x is right
 * -y is down, +y is up
 * -z is towards the camera, +z is away from the camera
 */

export const translateCurve = (curve: CubicBezierCurve3, position: Vector3) =>
  new CubicBezierCurve3(
    position.clone().add(curve.v0),
    position.clone().add(curve.v1),
    position.clone().add(curve.v2),
    position.clone().add(curve.v3),
  );

export const rotateBezierCurve = (
  curve: CubicBezierCurve3,
  euler: Euler,
  translate: Vector3 = new Vector3(0, 0, 0),
): CubicBezierCurve3 => {
  // Create rotation matrix from Euler angles
  const rotationMatrix = new Matrix4();
  rotationMatrix.makeRotationFromEuler(euler);

  // Clone and rotate each control point
  const v0 = curve.v0.clone();
  const v1 = curve.v1.clone();
  const v2 = curve.v2.clone();
  const v3 = curve.v3.clone();

  // Translate points to origin
  v0.sub(translate);
  v1.sub(translate);
  v2.sub(translate);
  v3.sub(translate);

  v0.applyMatrix4(rotationMatrix);
  v1.applyMatrix4(rotationMatrix);
  v2.applyMatrix4(rotationMatrix);
  v3.applyMatrix4(rotationMatrix);

  // Translate points back
  v0.add(translate);
  v1.add(translate);
  v2.add(translate);
  v3.add(translate);

  // Return new curve with rotated points
  return new CubicBezierCurve3(v0, v1, v2, v3);
};

export const useCurve = (curve: CubicBezierCurve3) => {
  return useMemo(() => {
    const points = curve.getPoints(5);
    return new CatmullRomCurve3(points);
  }, [curve]);
};

export const curveForRailTile = (tile: RailTile, transform?: Transform) => {
  const rotation = transform?.rotation || tile.rotation;
  return translateCurve(
    rotateBezierCurve(
      tile.type === 'straight' ? straightCurve : centerQuarterCurve,
      new Euler(rotation[0], rotation[1], rotation[2]),
      new Vector3(0, TILE_HALF_WIDTH, 0),
    ),
    new Vector3(
      tile.position[0],
      tile.position[1] - TILE_HALF_WIDTH,
      tile.position[2],
    ),
  );
};

export const curveForChoiceTile = (
  tile: JunctionTile,
  entrance: number,
  transform?: Transform,
) => {
  const rotation = transform?.rotation || tile.rotation;
  return translateCurve(
    rotateBezierCurve(
      tile.type === 't' ? tStraights[entrance] : tStraights[entrance],
      new Euler(rotation[0], rotation[1], rotation[2]),
      new Vector3(0, TILE_HALF_WIDTH, 0),
    ),
    new Vector3(
      tile.position[0],
      tile.position[1] - TILE_HALF_WIDTH,
      tile.position[2],
    ),
  );
};

export const pointAt45 = pointAroundCircle(45, INITIAL_SPHERE_RADIUS);

const distanceFromEdge = TILE_HALF_WIDTH - pointAt45.x;

// Constants for curve creation
const QUARTER_TURN_RADIUS = 1 - distanceFromEdge;
const QUARTER_TURN_HANDLE_LENGTH = QUARTER_TURN_RADIUS * 0.551915024494; // Magic number for approximating a circle with cubic Beziers

const QUARTER_CORRECTION = 0.08 * INITIAL_SPHERE_RADIUS;

// Create three curves that form a quarter circle
export const quarterCurve = new CubicBezierCurve3(
  new Vector3(0, 0, 0), // Start at origin
  new Vector3(-QUARTER_CORRECTION, QUARTER_TURN_HANDLE_LENGTH, 0), // Control point 1
  new Vector3(
    QUARTER_TURN_RADIUS - QUARTER_TURN_HANDLE_LENGTH,
    QUARTER_TURN_RADIUS + QUARTER_CORRECTION,
    0,
  ), // Control point 2
  new Vector3(QUARTER_TURN_RADIUS, QUARTER_TURN_RADIUS, 0), // End point
);

// Constants for curve creation
const SMALL_QUARTER_TURN_RADIUS = distanceFromEdge;
const SMALL_QUARTER_TURN_HANDLE_LENGTH =
  SMALL_QUARTER_TURN_RADIUS * 0.551915024494; // Magic number for approximating a circle with cubic Beziers

const SMALL_QUARTER_CORRECTION = 0.014 * INITIAL_SPHERE_RADIUS;

// Create three curves that form a SMALL_quarter circle
export const innerQuarterCurve = new CubicBezierCurve3(
  new Vector3(0, 0, 0), // Start at origin
  new Vector3(-SMALL_QUARTER_CORRECTION, SMALL_QUARTER_TURN_HANDLE_LENGTH, 0), // Control point 1
  new Vector3(
    SMALL_QUARTER_TURN_RADIUS - SMALL_QUARTER_TURN_HANDLE_LENGTH,
    SMALL_QUARTER_TURN_RADIUS + SMALL_QUARTER_CORRECTION,
    0,
  ), // Control point 2
  new Vector3(SMALL_QUARTER_TURN_RADIUS, SMALL_QUARTER_TURN_RADIUS, 0), // End point
);

const CENTER_QUARTER_TURN_RADIUS = TILE_HALF_WIDTH;
const CENTER_QUARTER_TURN_HANDLE_LENGTH =
  CENTER_QUARTER_TURN_RADIUS * 0.551915024494; // Magic number for approximating a circle with cubic Beziers

const CENTER_QUARTER_CORRECTION = 0.008 * INITIAL_SPHERE_RADIUS;

export const centerQuarterCurve = new CubicBezierCurve3(
  new Vector3(0, 0, 0), // Start at origin
  new Vector3(-CENTER_QUARTER_CORRECTION, CENTER_QUARTER_TURN_HANDLE_LENGTH, 0), // Control point 1
  new Vector3(
    CENTER_QUARTER_TURN_RADIUS - CENTER_QUARTER_TURN_HANDLE_LENGTH,
    CENTER_QUARTER_TURN_RADIUS + CENTER_QUARTER_CORRECTION,
    0,
  ), // Control point 2
  new Vector3(CENTER_QUARTER_TURN_RADIUS, CENTER_QUARTER_TURN_RADIUS, 0), // End point
);

export const straightCurve = new CubicBezierCurve3(
  new Vector3(0, 0, 0),
  new Vector3(0, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, 1, 0),
);

export const reverseBezierCurve = (curve: CubicBezierCurve3) =>
  new CubicBezierCurve3(
    curve.v3.clone(),
    curve.v2.clone(),
    curve.v1.clone(),
    curve.v0.clone(),
  );

export const tStraights = [
  // Left arm of T
  new CubicBezierCurve3(
    new Vector3(-TILE_HALF_WIDTH, TILE_HALF_WIDTH, 0),
    new Vector3(-TILE_HALF_WIDTH, TILE_HALF_WIDTH, 0),
    new Vector3(0, TILE_HALF_WIDTH, 0),
    new Vector3(0, TILE_HALF_WIDTH, 0),
  ),
  // Bottom of T
  new CubicBezierCurve3(
    new Vector3(0, 0, 0),
    new Vector3(0, 0, 0),
    new Vector3(0, TILE_HALF_WIDTH, 0),
    new Vector3(0, TILE_HALF_WIDTH, 0),
  ),
  // Right arm of T
  new CubicBezierCurve3(
    new Vector3(TILE_HALF_WIDTH, TILE_HALF_WIDTH, 0),
    new Vector3(TILE_HALF_WIDTH, TILE_HALF_WIDTH, 0),
    new Vector3(0, TILE_HALF_WIDTH, 0),
    new Vector3(0, TILE_HALF_WIDTH, 0),
  ),
];

// Generate the computed / runtime data for this tile
export const computeTrackTile = (
  tile: RailTile | JunctionTile,
  transform?: Transform,
): TileComputed => {
  if (isRailTile(tile)) {
    const curve = curveForRailTile(tile, transform);
    return {
      curves: [curve],
      exits: [curve.getPointAt(0), curve.getPointAt(1)],
    };
  } else if (isJunctionTile(tile)) {
    const curves = [0, 1, 2].map((i) => curveForChoiceTile(tile, i, transform));
    return {
      curves,
      exits: curves.map((c) => c.getPointAt(0)),
    };
  }
  throw new Error('Toilet Bloing!');
};
