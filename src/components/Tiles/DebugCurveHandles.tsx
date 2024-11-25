import { CubicBezierCurve3 } from 'three';
import { RAIL_RADIUS } from '../../game/constants';

const DebugCurveHandles = ({
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

export default DebugCurveHandles;
