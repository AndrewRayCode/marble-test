import { RailTile, useGameStore } from '@/store/gameStore';
import { RAIL_RADIUS, TILE_HALF_WIDTH } from '../../game/constants';
import {
  innerQuarterCurve,
  pointAt45,
  quarterCurve,
  useCurve,
} from '@/util/curves';
import { useSpring, a } from '@react-spring/three';
import DebugCurveHandles from './DebugCurveHandles';

const QuarterTurn = ({ tile }: { tile: RailTile }) => {
  const { position: meshPosition, rotation: meshRotation, showSides } = tile;
  const c1 = useCurve(quarterCurve);
  const c2 = useCurve(innerQuarterCurve);
  const debug = useGameStore((state) => state.debug);
  const transform = useGameStore((state) => state.transforms[tile.id]);

  // Configure spring animation for rotation
  const { position, rotation } = useSpring({
    position: transform?.position || meshPosition,
    rotation: transform?.rotation || meshRotation,
    config: {
      mass: 1,
      tension: 170,
      friction: 26,
    },
  });

  return (
    <a.group
      position={position}
      rotation={rotation as unknown as [number, number, number]}
    >
      {debug && (
        <DebugCurveHandles
          curve={quarterCurve}
          position={[-pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}
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
        <mesh position={[pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}>
          <tubeGeometry args={[c2, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
      {/* front left */}
      {['all', 'front', 'left'].includes(showSides) ? (
        <mesh position={[-pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}>
          <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
      {/* back right */}
      {['all', 'right', 'back'].includes(showSides) ? (
        <mesh position={[pointAt45.x, -TILE_HALF_WIDTH, -pointAt45.y]}>
          <tubeGeometry args={[c2, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
      {/* back left */}
      {['all', 'left', 'back'].includes(showSides) ? (
        <mesh position={[-pointAt45.x, -TILE_HALF_WIDTH, -pointAt45.y]}>
          <tubeGeometry args={[c1, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
    </a.group>
  );
};

export default QuarterTurn;
