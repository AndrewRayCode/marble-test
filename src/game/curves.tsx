import { Tile, useStore } from '@/store/store';
import { useMemo } from 'react';
import {
  CatmullRomCurve3,
  CubicBezierCurve3,
  Euler,
  Matrix4,
  Vector3,
} from 'three';
import { INITIAL_SPHERE_RADIUS, RAIL_RADIUS } from './constants';
import { pointAroundCircle } from '@/util/math';

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

const pointAt45 = pointAroundCircle(45, INITIAL_SPHERE_RADIUS);

const distanceFromEdge = INITIAL_SPHERE_RADIUS - pointAt45.x;

// Constants for curve creation
const QUARTER_TURN_RADIUS = 1 - distanceFromEdge;
const QUARTER_TURN_HANDLE_LENGTH = QUARTER_TURN_RADIUS * 0.551915024494; // Magic number for approximating a circle with cubic Beziers

const QUARTER_CORRECTION = 0.08;

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

const SMALL_QUARTER_CORRECTION = 0.017;

// Create three curves that form a SMALL_quarter circle
const innerQuarterCurve = new CubicBezierCurve3(
  new Vector3(0, 0, 0), // Start at origin
  new Vector3(-SMALL_QUARTER_CORRECTION, SMALL_QUARTER_TURN_HANDLE_LENGTH, 0), // Control point 1
  new Vector3(
    SMALL_QUARTER_TURN_RADIUS - SMALL_QUARTER_TURN_HANDLE_LENGTH,
    SMALL_QUARTER_TURN_RADIUS + SMALL_QUARTER_CORRECTION,
    0,
  ), // Control point 2
  new Vector3(SMALL_QUARTER_TURN_RADIUS, SMALL_QUARTER_TURN_RADIUS, 0), // End point
);

const CENTER_QUARTER_TURN_RADIUS = 0.5;
const CENTER_QUARTER_TURN_HANDLE_LENGTH =
  CENTER_QUARTER_TURN_RADIUS * 0.551915024494; // Magic number for approximating a circle with cubic Beziers

const CENTER_QUARTER_CORRECTION = 0.08;

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

export const Straightaway = ({ tile }: { tile: Tile }) => {
  const { position, rotation, showSides } = tile;
  const c1 = useCurve(straightCurve);
  const debug = useStore((state) => state.debug);

  // With a camera at the positive 6 position:
  // -x is left, +x is right
  // -y is down, +y is up
  // -z is towards the camera, +z is away from the camera

  return (
    <group position={position} rotation={rotation}>
      {debug && (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" wireframe />
        </mesh>
      )}
      {/* front right */}
      {['all', 'right', 'front'].includes(showSides) ? (
        <mesh position={[pointAt45.x, -0.5, pointAt45.y]}>
          <tubeGeometry args={[c1, 70, 0.02, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
          />
        </mesh>
      ) : null}
      {/* front left */}
      {['all', 'front', 'left'].includes(showSides) ? (
        <mesh position={[-pointAt45.x, -0.5, pointAt45.y]}>
          <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
          />
        </mesh>
      ) : null}
      {/* back right */}
      {['all', 'right', 'back'].includes(showSides) ? (
        <mesh position={[pointAt45.x, -0.5, -pointAt45.y]}>
          <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
          />
        </mesh>
      ) : null}
      {/* back left */}
      {['all', 'left', 'back'].includes(showSides) ? (
        <mesh position={[-pointAt45.x, -0.5, -pointAt45.y]}>
          <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
          />
        </mesh>
      ) : null}
    </group>
  );
};

export const DebugCurveHandles = ({
  curve,
  position,
}: {
  curve: CubicBezierCurve3;
  position?: [number, number, number];
}) => {
  return (
    <group position={position}>
      <mesh position={curve.v0}>
        <sphereGeometry args={[RAIL_RADIUS + 0.01]} />
        <meshBasicMaterial color="blue" transparent opacity={0.3} />
      </mesh>
      <mesh position={curve.v1}>
        <sphereGeometry args={[RAIL_RADIUS + 0.01]} />
        <meshBasicMaterial color="green" transparent opacity={0.3} />
      </mesh>
      <mesh position={curve.v2}>
        <sphereGeometry args={[RAIL_RADIUS + 0.01]} />
        <meshBasicMaterial color="green" transparent opacity={0.3} />
      </mesh>
      <mesh position={curve.v3}>
        <sphereGeometry args={[RAIL_RADIUS + 0.01]} />
        <meshBasicMaterial color="blue" transparent opacity={0.3} />
      </mesh>
    </group>
  );
};

export const QuarterTurn = ({ tile }: { tile: Tile }) => {
  const { position, rotation, showSides } = tile;
  const c1 = useCurve(quarterCurve);
  const c2 = useCurve(innerQuarterCurve);
  const debug = useStore((state) => state.debug);

  // With a camera at the positive 6 position:
  // -x is left, +x is right
  // -y is down, +y is up
  // -z is towards the camera, +z is away from the camera

  return (
    <group position={position} rotation={rotation}>
      {debug && (
        <DebugCurveHandles
          curve={quarterCurve}
          position={[-pointAt45.x, -0.5, pointAt45.y]}
        />
      )}
      {debug && (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial wireframe color="green" />
        </mesh>
      )}
      {/* front right */}
      {['all', 'right', 'front'].includes(showSides) ? (
        <mesh position={[pointAt45.x, -0.5, pointAt45.y]}>
          <tubeGeometry args={[c2, 70, 0.02, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
          />
        </mesh>
      ) : null}
      {/* front left */}
      {['all', 'front', 'left'].includes(showSides) ? (
        <mesh position={[-pointAt45.x, -0.5, pointAt45.y]}>
          <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
          />
        </mesh>
      ) : null}
      {/* back right */}
      {['all', 'right', 'back'].includes(showSides) ? (
        <mesh position={[pointAt45.x, -0.5, -pointAt45.y]}>
          <tubeGeometry args={[c2, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
          />
        </mesh>
      ) : null}
      {/* back left */}
      {['all', 'left', 'back'].includes(showSides) ? (
        <mesh position={[-pointAt45.x, -0.5, -pointAt45.y]}>
          <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
          />
        </mesh>
      ) : null}
    </group>
  );
};
