import { SPHERE_RADIUS } from '@/game/constants';
import { PLAYER_ID, useGameStore } from '@/store/gameStore';
import { useEffect, useRef } from 'react';
import { Mesh } from 'three';

const Player = () => {
  const playerRef = useRef<Mesh | null>(null);

  useEffect(() =>
    // These need to update every frame, but we can't set state per frame,
    // nor do we want this component to render every frame, so subscribe to
    // "transient" updates, which doesn't trigger a re-render, but we can still
    // react to it
    useGameStore.subscribe((state) => {
      playerRef.current?.position.set(
        state.dynamicObjects[PLAYER_ID].position[0],
        state.dynamicObjects[PLAYER_ID].position[1],
        state.dynamicObjects[PLAYER_ID].position[2],
      );
    }),
  );

  return (
    <mesh ref={playerRef} castShadow>
      <sphereGeometry args={[SPHERE_RADIUS, 128, 128]} />
      <meshStandardMaterial
        metalness={0.4}
        roughness={0.01}
        envMapIntensity={0.5}
        emissive={0x333333}
      />
    </mesh>
  );
};

export default Player;
