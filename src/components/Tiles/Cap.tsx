import { CapTile, useGameStore } from '@/store/gameStore';
import {
  INITIAL_SPHERE_RADIUS,
  RAIL_RADIUS,
  TILE_HALF_WIDTH,
} from '../../game/constants';
import { halfTurn, pointAt45, smallStraight, useCurve } from '@/util/curves';
import { useRefMap } from '@/util/react';
import { Group, Vector3 } from 'three';
import { useLayoutEffect, useMemo } from 'react';
import { toWorld } from '@/util/math';
import { useSpring, a } from '@react-spring/three';

const scale = INITIAL_SPHERE_RADIUS * 2;

const Cap = ({ tile, opacity }: { tile: CapTile; opacity?: number }) => {
  const { position: meshPosition, rotation: meshRotation, showSides } = tile;
  const half = useCurve(halfTurn);
  const debug = useGameStore((state) => state.debug);
  const transform = useGameStore((state) => state.transforms[tile.id]);
  const setExitPositions = useGameStore((state) => state.setExitPositions);
  const [exitRefs, setExitRef] = useRefMap<Group>();
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

  const exit = useMemo(
    () => smallStraight.getPointAt(0).sub(new Vector3(0, TILE_HALF_WIDTH, 0)),
    [],
  );

  useLayoutEffect(() => {
    if (exitRefs) {
      setExitPositions(tile.id, [toWorld(exitRefs.get(0)!)]);
    }
  }, [tile, setExitPositions, exitRefs]);

  return (
    <a.group
      position={position}
      rotation={rotation as unknown as [number, number, number]}
    >
      <group position={exit} ref={setExitRef(0)}></group>
      {debug && (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            opacity={matOpacity}
            transparent={matOpacity < 1}
            wireframe
            color="green"
          />
        </mesh>
      )}
      <mesh
        position={[-pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}
        scale={[scale, scale, scale]}
        rotation={[0, Math.PI / 4, 0]}
      >
        <tubeGeometry args={[half, 70, RAIL_RADIUS + 0.004, 50, false]} />
        <meshStandardMaterial
          opacity={matOpacity}
          transparent={matOpacity < 1}
          roughness={0}
          metalness={1.0}
          wireframe={debug}
          color="#777777"
        />
      </mesh>
      <mesh
        position={[pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}
        scale={[scale, scale, scale]}
        rotation={[0, 0.75 * Math.PI, 0]}
      >
        <tubeGeometry args={[half, 70, RAIL_RADIUS + 0.004, 50, false]} />
        <meshStandardMaterial
          opacity={matOpacity}
          transparent={matOpacity < 1}
          roughness={0}
          metalness={1.0}
          wireframe={debug}
          color="#777777"
        />
      </mesh>
    </a.group>
  );
};

export default Cap;
