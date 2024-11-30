import { TILE_HALF_WIDTH } from '@/game/constants';
import { GateTile, useGameStore } from '@/store/gameStore';
import { useSpring, a } from '@react-spring/three';

export const GATE_DEPTH = 0.1;

const Gate = ({
  tile,
  opacity,
  visible,
}: {
  tile: GateTile;
  opacity?: number;
  visible?: boolean;
}) => {
  const { position: meshPosition, rotation: meshRotation } = tile;
  const transform = useGameStore((state) => state.transforms[tile.id]);
  const gateStates = useGameStore((state) => state.gateStates);
  const matOpacity = opacity || 1;
  const gateState =
    tile.id in gateStates ? gateStates[tile.id] : tile.defaultState;

  const { position, rotation } = useSpring({
    position: transform?.position || meshPosition,
    rotation: transform?.rotation || meshRotation,
    config: {
      mass: 1,
      tension: 170,
      friction: 26,
    },
  });

  const { rotation: gateRotation } = useSpring({
    rotation: gateState === 'closed' ? [0, 0, 0] : [0, 0, Math.PI / 2],
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
      visible={visible === undefined ? true : visible}
    >
      <a.group
        position={[-TILE_HALF_WIDTH, 0, 0]}
        rotation={gateRotation as unknown as [number, number, number]}
      >
        <mesh position={[0.5, 0, 0]}>
          <boxGeometry args={[1, 0.2, GATE_DEPTH]} />
          <meshBasicMaterial
            color={gateState === 'closed' ? 'red' : 'green'}
            opacity={matOpacity}
            transparent={matOpacity < 1}
          />
        </mesh>
      </a.group>
    </a.group>
  );
};

export default Gate;
