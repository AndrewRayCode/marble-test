import { RailTile, useGameStore } from '@/store/gameStore';
import { useLayoutEffect, useMemo } from 'react';
import { Group, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three';
import { RAIL_RADIUS, TILE_HALF_WIDTH } from '@/game/constants';
import { railMaterial } from '@/game/materials';
import { toWorld } from '@/util/math';
import { useRefMap } from '@/util/react';
import { pointAt45, straightCurve, tStraights, useCurve } from '@/util/curves';
import { a, useSpring } from '@react-spring/three';

const Straightaway = ({
  tile,
  opacity,
}: {
  tile: RailTile;
  opacity?: number;
}) => {
  const { position: meshPosition, rotation: meshRotation, showSides } = tile;
  const c1 = useCurve(straightCurve);
  const debug = useGameStore((state) => state.debug);
  const setExitPositions = useGameStore((state) => state.setExitPositions);
  const transform = useGameStore((state) => state.transforms[tile.id]);
  const [exitRefs, setExitRef] = useRefMap<Group>();
  const matOpacity = opacity || 1;

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
  const railGeometry = useMemo(
    () => new TubeGeometry(c1, 70, RAIL_RADIUS, 50, false),
    [c1],
  );

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
        <mesh castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" wireframe />
        </mesh>
      )}
      {exits.map((exit, i) => (
        <group key={i} position={exit} ref={setExitRef(i)}></group>
      ))}
      {/* front right */}
      {['all', 'right', 'front'].includes(showSides) ? (
        <mesh
          castShadow
          position={[pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}
        >
          <primitive object={railGeometry} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
      {/* front left */}
      {['all', 'front', 'left'].includes(showSides) ? (
        <mesh
          castShadow
          position={[-pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}
        >
          <primitive object={railGeometry} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
      {/* back right */}
      {['all', 'right', 'back'].includes(showSides) ? (
        <mesh
          castShadow
          position={[pointAt45.x, -TILE_HALF_WIDTH, -pointAt45.y]}
        >
          <primitive object={railGeometry} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
      {/* back left */}
      {['all', 'left', 'back'].includes(showSides) ? (
        <mesh
          castShadow
          position={[-pointAt45.x, -TILE_HALF_WIDTH, -pointAt45.y]}
        >
          <primitive object={railGeometry} />
          <primitive object={railMat} />
        </mesh>
      ) : null}
    </a.group>
  );
};

export default Straightaway;
