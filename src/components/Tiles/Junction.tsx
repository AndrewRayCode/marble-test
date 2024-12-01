import { JunctionTile, useGameStore } from '@/store/gameStore';
import { RAIL_RADIUS, TILE_HALF_WIDTH } from '../../game/constants';
import {
  innerQuarterCurve,
  pointAt45,
  straightCurve,
  tStraights,
  useCurve,
} from '@/util/curves';
import { useRefMap } from '@/util/react';
import { Group, MeshStandardMaterial, Vector3 } from 'three';
import { useLayoutEffect, useMemo } from 'react';
import { toWorld } from '@/util/math';
import { useSpring, a } from '@react-spring/three';
import { railMaterial } from '@/game/materials';

const Junction = ({
  tile,
  opacity,
}: {
  tile: JunctionTile;
  opacity?: number;
}) => {
  const { position: meshPosition, rotation: meshRotation, showSides } = tile;
  const str8 = useCurve(straightCurve);
  const small = useCurve(innerQuarterCurve);
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

  const exits = useMemo(
    () =>
      tStraights.map((c) =>
        c.getPointAt(0).sub(new Vector3(0, TILE_HALF_WIDTH, 0)),
      ),
    [],
  );

  useLayoutEffect(() => {
    if (exitRefs) {
      setExitPositions(
        tile.id,
        [...exitRefs.values()].map((v) => toWorld(v)),
      );
    }
  }, [tile, setExitPositions, exitRefs]);

  const railMat = useMemo(
    () =>
      new MeshStandardMaterial({
        opacity: matOpacity,
        transparent: matOpacity < 1,
        wireframe: debug,
        ...railMaterial,
      }),
    [debug, matOpacity],
  );

  return (
    <a.group
      position={position}
      rotation={rotation as unknown as [number, number, number]}
    >
      {exits.map((exit, i) => (
        <group key={i} position={exit} ref={setExitRef(i)}></group>
      ))}
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
      {/* front right */}
      {['all', 'right', 'front'].includes(showSides) ? (
        <mesh
          castShadow
          position={[pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}
        >
          <tubeGeometry args={[small, 70, RAIL_RADIUS, 50, false]} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
      {/* front left */}
      {['all', 'front'].includes(showSides) ? (
        <mesh
          castShadow
          position={[-pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}
          rotation={[0, Math.PI, 0]}
        >
          <tubeGeometry args={[small, 70, RAIL_RADIUS, 50, false]} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
      {/* back right */}
      {['all', 'back'].includes(showSides) ? (
        <mesh
          castShadow
          position={[pointAt45.x, -TILE_HALF_WIDTH, -pointAt45.y]}
        >
          <tubeGeometry args={[small, 70, RAIL_RADIUS, 50, false]} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
      {/* back left */}
      {['all', 'back'].includes(showSides) ? (
        <mesh
          castShadow
          position={[-pointAt45.x, -TILE_HALF_WIDTH, -pointAt45.y]}
          rotation={[0, Math.PI, 0]}
        >
          <tubeGeometry args={[small, 70, RAIL_RADIUS, 50, false]} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
      {/* top back */}
      {['all', 'back'].includes(showSides) ? (
        <mesh
          castShadow
          position={[-TILE_HALF_WIDTH, pointAt45.y, -pointAt45.y]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <tubeGeometry args={[str8, 70, RAIL_RADIUS, 50, false]} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
      {/* top front */}
      {['all', 'front'].includes(showSides) ? (
        <mesh
          castShadow
          position={[-TILE_HALF_WIDTH, pointAt45.y, pointAt45.y]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <tubeGeometry args={[str8, 70, RAIL_RADIUS, 50, false]} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
    </a.group>
  );
};

export default Junction;
