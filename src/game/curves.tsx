import { useStore } from '@/store/store';
import { useMemo } from 'react';
import { CatmullRomCurve3, CubicBezierCurve3, Vector3 } from 'three';
import { INITIAL_SPHERE_RADIUS, RAIL_RADIUS } from './constants';
import { pointAroundCircle } from '@/util/math';

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
const quarterCurve = new CubicBezierCurve3(
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

export const straightCurve = new CubicBezierCurve3(
  new Vector3(0, 0, 0),
  new Vector3(0, 0, 0),
  new Vector3(0, 1, 0),
  new Vector3(0, 1, 0),
);

export const Straightaway = ({
  position,
  rotation,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) => {
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
      <mesh position={[pointAt45.x, -0.5, pointAt45.y]}>
        <tubeGeometry args={[c1, 70, 0.02, 50, false]} />
        <meshStandardMaterial roughness={0} metalness={1.0} />
      </mesh>
      {/* front left */}
      <mesh position={[-pointAt45.x, -0.5, pointAt45.y]}>
        <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
        <meshStandardMaterial roughness={0} metalness={1.0} />
      </mesh>
      {/* back right */}
      <mesh position={[pointAt45.x, -0.5, -pointAt45.y]}>
        <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
        <meshStandardMaterial roughness={0} metalness={1.0} />
      </mesh>
      {/* back left */}
      <mesh position={[-pointAt45.x, -0.5, -pointAt45.y]}>
        <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
        <meshStandardMaterial roughness={0} metalness={1.0} />
      </mesh>
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

export const QuarterTurn = ({
  position,
  rotation,
}: {
  position?: [number, number, number];
  rotation?: [number, number, number];
}) => {
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
      <mesh position={[pointAt45.x, -0.5, pointAt45.y]}>
        <tubeGeometry args={[c2, 70, 0.02, 50, false]} />
        <meshStandardMaterial roughness={0} metalness={1.0} />
      </mesh>
      {/* front left */}
      <mesh position={[-pointAt45.x, -0.5, pointAt45.y]}>
        <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
        <meshStandardMaterial roughness={0} metalness={1.0} />
      </mesh>
      {/* back right */}
      <mesh position={[pointAt45.x, -0.5, -pointAt45.y]}>
        <tubeGeometry args={[c2, 70, RAIL_RADIUS, 50, false]} />
        <meshStandardMaterial roughness={0} metalness={1.0} />
      </mesh>
      {/* back left */}
      <mesh position={[-pointAt45.x, -0.5, -pointAt45.y]}>
        <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
        <meshStandardMaterial roughness={0} metalness={1.0} />
      </mesh>
    </group>
  );
};
