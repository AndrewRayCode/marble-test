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
import { Group, Vector3 } from 'three';
import { useLayoutEffect, useMemo } from 'react';
import { toWorld } from '@/util/math';

const Junction = ({ tile }: { tile: JunctionTile }) => {
  const { position, rotation, showSides } = tile;
  const str8 = useCurve(straightCurve);
  const small = useCurve(innerQuarterCurve);
  const debug = useGameStore((state) => state.debug);
  const setExitPositions = useGameStore((state) => state.setExitPositions);
  const [exitRefs, setExitRef] = useRefMap<Group>();

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

  return (
    <group position={position} rotation={rotation}>
      {exits.map((exit, i) => (
        <group key={i} position={exit} ref={setExitRef(i)}></group>
      ))}
      {debug && (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial wireframe color="green" />
        </mesh>
      )}
      {/* front right */}
      {['all', 'right', 'front'].includes(showSides) ? (
        <mesh position={[pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}>
          <tubeGeometry args={[small, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
      {/* front left */}
      {['all', 'front'].includes(showSides) ? (
        <mesh
          position={[-pointAt45.x, -TILE_HALF_WIDTH, pointAt45.y]}
          rotation={[0, Math.PI, 0]}
        >
          <tubeGeometry args={[small, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
      {/* back right */}
      {['all', 'back'].includes(showSides) ? (
        <mesh position={[pointAt45.x, -TILE_HALF_WIDTH, -pointAt45.y]}>
          <tubeGeometry args={[small, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
      {/* back left */}
      {['all', 'back'].includes(showSides) ? (
        <mesh
          position={[-pointAt45.x, -TILE_HALF_WIDTH, -pointAt45.y]}
          rotation={[0, Math.PI, 0]}
        >
          <tubeGeometry args={[small, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
      {/* top back */}
      {['all', 'back'].includes(showSides) ? (
        <mesh
          position={[-TILE_HALF_WIDTH, pointAt45.y, -pointAt45.y]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <tubeGeometry args={[str8, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
      {/* top front */}
      {['all', 'front'].includes(showSides) ? (
        <mesh
          position={[-TILE_HALF_WIDTH, pointAt45.y, pointAt45.y]}
          rotation={[0, 0, -Math.PI / 2]}
        >
          <tubeGeometry args={[str8, 70, RAIL_RADIUS, 50, false]} />
          <meshStandardMaterial
            roughness={0}
            metalness={1.0}
            wireframe={debug}
            color="#777777"
          />
        </mesh>
      ) : null}
    </group>
  );
};

export default Junction;
