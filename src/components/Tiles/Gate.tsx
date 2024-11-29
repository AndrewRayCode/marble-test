import { GateTile, useGameStore } from '@/store/gameStore';
import { useSpring, a } from '@react-spring/three';

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

  const { position, rotation } = useSpring({
    position: transform?.position || meshPosition,
    rotation: transform?.rotation || meshRotation,
    config: {
      mass: 1,
      tension: 170,
      friction: 26,
    },
  });

  const gateState =
    tile.id in gateStates ? gateStates[tile.id] : tile.defaultState;

  return (
    <a.group
      position={position}
      rotation={rotation as unknown as [number, number, number]}
      visible={visible === undefined ? true : visible}
    >
      <mesh>
        <boxGeometry args={[0.1, 0.1, 0.1]} />
        <meshBasicMaterial
          color={gateState === 'closed' ? 'red' : 'green'}
          opacity={matOpacity}
          transparent={matOpacity < 1}
        />
      </mesh>
    </a.group>
  );
};

export default Gate;
