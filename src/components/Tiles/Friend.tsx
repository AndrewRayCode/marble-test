import { SPHERE_RADIUS } from '@/game/constants';
import { FriendTile, useGameStore } from '@/store/gameStore';
import { useLayoutEffect, useRef } from 'react';
import { Mesh } from 'three';

const Friend = ({ tile, opacity }: { tile: FriendTile; opacity?: number }) => {
  const { position: meshPosition, rotation: meshRotation, color } = tile;
  const matOpacity = opacity || 1;

  const friendRef = useRef<Mesh | null>(null);

  useLayoutEffect(() =>
    useGameStore.subscribe((state) => {
      if (state.isEditing) {
        friendRef.current?.position.set(
          meshPosition[0],
          meshPosition[1],
          meshPosition[2],
        );
      } else if (state.dynamicObjects[tile.id]) {
        friendRef.current?.position.set(
          state.dynamicObjects[tile.id].position[0],
          state.dynamicObjects[tile.id].position[1],
          state.dynamicObjects[tile.id].position[2],
        );
      }
    }),
  );

  return (
    <mesh
      ref={friendRef}
      castShadow
      position={meshPosition}
      rotation={meshRotation}
    >
      <sphereGeometry args={[SPHERE_RADIUS, 128, 128]} />
      <meshStandardMaterial
        roughness={0.1}
        metalness={0.5}
        opacity={matOpacity}
        transparent={matOpacity < 1}
        color={color}
      />
    </mesh>
  );
};

export default Friend;
