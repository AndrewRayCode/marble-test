import { SphereTile, useGameStore } from '@/store/gameStore';
import { useSpring, a } from '@react-spring/three';

const Sphere = ({ tile, opacity }: { tile: SphereTile; opacity?: number }) => {
  const {
    position: meshPosition,
    rotation: meshRotation,
    scale: sphereScale,
    color,
  } = tile;
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
      scale={sphereScale}
    >
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          roughness={0.5}
          opacity={matOpacity}
          transparent={matOpacity < 1}
          color={color}
        />
      </mesh>
    </a.group>
  );
};

export default Sphere;
