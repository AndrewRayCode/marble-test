import { BoxTile, useGameStore } from '@/store/gameStore';
import { useSpring, a } from '@react-spring/three';

const Box = ({ tile, opacity }: { tile: BoxTile; opacity?: number }) => {
  const { position: meshPosition, rotation: meshRotation, color } = tile;
  const transform = useGameStore((state) => state.transforms[tile.id]);
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

  return (
    <a.group
      position={position}
      rotation={rotation as unknown as [number, number, number]}
    >
      <mesh receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          roughness={0.1}
          opacity={matOpacity}
          transparent={matOpacity < 1}
          color={color}
        />
      </mesh>
    </a.group>
  );
};

export default Box;
