import { CoinTile, useGameStore } from '@/store/gameStore';
import { useSpring, a } from '@react-spring/three';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Group } from 'three';

const COIN_DIAMETER = 0.15;
const COIN_HEIGHT = 0.04;

const Coin = ({
  tile,
  opacity,
  visible,
}: {
  tile: CoinTile;
  opacity?: number;
  visible?: boolean;
}) => {
  const { position: meshPosition, rotation: meshRotation } = tile;
  const transform = useGameStore((state) => state.transforms[tile.id]);
  const matOpacity = opacity || 1;
  const meshRef = useRef<Group>(null);

  useFrame((state, delta) => {
    meshRef.current!.rotation.y += 1.5 * delta;
  });

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
      visible={visible === undefined ? true : visible}
    >
      <group ref={meshRef}>
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry
            args={[COIN_DIAMETER, COIN_DIAMETER, COIN_HEIGHT, 32]}
          />
          <meshStandardMaterial
            opacity={matOpacity}
            transparent={matOpacity < 1}
            color="silver"
            roughness={0.0}
            metalness={0.5}
          />
        </mesh>
      </group>
    </a.group>
  );
};

export default Coin;
