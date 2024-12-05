'use client';

import { forwardRef, memo, useEffect, useMemo, useRef, useState } from 'react';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import {
  TransformControls,
  Grid,
  TransformControlsProps,
} from '@react-three/drei';

import {
  JunctionTile,
  makeId,
  RailTile,
  Side,
  ButtonTile,
  TileBase,
  useGameStore,
  CapTile,
  BoxTile,
  CoinTile,
  GateTile,
  SphereTile,
  GroupTile,
  FriendTile,
  Tile,
} from '@/store/gameStore';

import { useKeyPress, useRefMap } from '@/util/react';
import { DoubleSide, Euler, Group as ThreeGroup, Vector3 } from 'three';

import { PLAYER_SPEED, TILE_HALF_WIDTH } from '@/game/constants';
import Straightaway from '../Tiles/Straightaway';
import QuarterTurn from '../Tiles/QuarterTurn';
import Junction from '../Tiles/Junction';
import Toggle from '../Tiles/Toggle';
import Cap from '../Tiles/Cap';
import Box from '../Tiles/Box';
import Coin from '../Tiles/Coin';
import Gate from '../Tiles/Gate';
import Sphere from '../Tiles/Sphere';
import Group from '../Tiles/Group';
import Friend from '../Tiles/Friend';

type EditorProps = {
  setOrbitEnabled: (enabled: boolean) => void;
};

type Triple = [number, number, number];

const cardinalRotations: Triple[] = [
  [0, 0, 0],
  [Math.PI / 2, 0, 0],
  [0, 0, Math.PI / 2],
];

// Apparently the grid, or is it planeGeometry? Starts pointing at an unexpected
// angle. So <Grid onPointerMove={} /> casts against a plane not at the same
// direction as the Grid itself. This is used to rotate an invisible plane the
// same direction as the grid! Wnat a nightmare!
const wtfRotations: Triple[] = [
  [Math.PI / 2, 0, 0],
  [0, 0, 0],
  [0, Math.PI / 2, 0],
];

const defaultTiles: { [K in Tile['type']]: Extract<Tile, { type: K }> } = {
  straight: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    parentId: null,
    type: 'straight',
    showSides: 'all' as Side,
    connections: [null, null],
    entrances: [null, null],
  } as Extract<Tile, { type: 'straight' }>,
  quarter: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 'quarter',
    parentId: null,
    showSides: 'all' as Side,
    connections: [null, null],
    entrances: [null, null],
  } as Extract<Tile, { type: 'quarter' }>,
  t: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 't',
    parentId: null,
    showSides: 'all' as Side,
    connections: [null, null, null],
    entrances: [null, null, null],
  },
  button: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 'button',
    parentId: null,
    actionType: 'toggle',
    actions: [],
  },
  cap: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 'cap',
    parentId: null,
    showSides: 'all' as Side,
    connections: [null],
    entrances: [null],
  },
  box: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 'box',
    parentId: null,
    color: '#ffffff',
  },
  sphere: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 'sphere',
    parentId: null,
    color: '#ffffff',
  },
  coin: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 'coin',
    parentId: null,
  },
  gate: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 'gate',
    parentId: null,
    defaultState: 'closed',
  },
  group: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 'group',
    parentId: null,
  },
  friend: {
    id: `editor_cursor_${makeId()}`,
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    type: 'friend',
    parentId: null,
    color: '#000000',
    startingTileId: null,
    directionBehavior: 'random',
    hitBehavior: 'bounce',
    deadEndBehavior: 'bounce',
    speed: '' + PLAYER_SPEED,
    startingDirection: 1,
  },
};

const TransformMemoized = memo(
  forwardRef(function TransformMemoized(props: TransformControlsProps, ref) {
    // @ts-expect-error - bad ref types
    return <TransformControls {...props} ref={ref} />;
  }),
);

const Editor = ({ setOrbitEnabled }: EditorProps) => {
  const levels = useGameStore((state) => state.levels);
  const currentLevelId = useGameStore((state) => state.currentLevelId);
  const selectedTileId = useGameStore((state) => state.selectedTileId);
  const setSelectedTileId = useGameStore((state) => state.setSelectedTileId);
  const hoverTileId = useGameStore((state) => state.hoverTileId);
  const setHoverTileId = useGameStore((state) => state.setHoverTileId);
  const updateTileAndRecompute = useGameStore(
    (state) => state.updateTileAndRecompute,
  );
  const addTile = useGameStore((state) => state.addTile);
  const deleteTile = useGameStore((state) => state.deleteTile);
  const showCursor = useGameStore((state) => state.showCursor);
  const setShowCursor = useGameStore((state) => state.setShowCursor);
  const createType = useGameStore((state) => state.createType);
  const autoSnap = useGameStore((state) => state.autoSnap);
  const tilesComputed = useGameStore((state) => state.tilesComputed);

  const [tileRefs, setTileRefs] = useRefMap<ThreeGroup>();

  const level = useMemo(() => {
    if (currentLevelId) {
      return levels.find((l) => l.id === currentLevelId);
    }
  }, [levels, currentLevelId]);
  const selectedTile = level?.tiles?.find((tile) => tile.id === selectedTileId);

  const targetTileIds =
    selectedTile?.type === 'button'
      ? selectedTile.actions?.reduce<string[]>(
          (as, a) => ('targetTiles' in a ? [...as, ...a.targetTiles] : as),
          [],
        )
      : selectedTile?.parentId
        ? [selectedTile.parentId]
        : selectedTile?.type === 'group'
          ? level?.tiles
              .filter((t) => t.parentId === selectedTile.id)
              .map((t) => t.id)
          : [];

  const [gridPosition, setGridPosition] = useState([
    TILE_HALF_WIDTH,
    0,
    TILE_HALF_WIDTH,
  ]);
  const [cursorRotation, setCursorRotation] = useState<Triple>([0, 0, 0]);
  const [gridRotation, setGridRotation] = useState(0);
  const [draggingTransform, setDraggingTransform] = useState(false);
  const [overTransform, setOverTransform] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<Triple>([0, 0, 0]);

  const cursorSnappedPosition = cursorPosition.map((pos, i) => {
    return (
      Math.round(pos * 4.0) / 4.0 +
      (gridRotation === 0 && i == 1 ? 0.5 : 0) +
      (gridRotation === 1 && i == 2 ? 0.5 : 0) +
      (gridRotation === 2 && i == 0 ? 0.5 : 0)
    );
  }) as Triple;

  useKeyPress('a', () => {
    if (!showCursor) {
      setHoverTileId(null);
      setSelectedTileId(null);
    }
    setShowCursor(!showCursor);
  });

  useKeyPress('x', () => {
    if (selectedTileId) {
      setSelectedTileId(null);
      deleteTile(selectedTileId);
    }
  });

  useKeyPress('g', () => {
    setGridPosition((prev) => {
      if (selectedTile && level) {
        const parent =
          selectedTile.parentId !== null
            ? level.tiles.find((t) => t.id === selectedTile.parentId)
            : null;
        const position = tilesComputed[
          selectedTile.id
        ]?.position?.toArray() || [
          // Boxes don't have computed positions! So re-add the parent
          // offset
          selectedTile.position[0] + (parent ? parent.position[0] : 0),
          selectedTile.position[1] + (parent ? parent.position[1] : 0),
          selectedTile.position[2] + (parent ? parent.position[2] : 0),
        ];

        if (gridRotation === 1) {
          return [
            // Rotate around y, go left
            position[0] - 0.5,
            // Move grid so squares line up with where tiles place
            position[1] - 0.5,
            position[2] - 0.5,
          ];
          // No rotation, go down
        } else if (gridRotation === 2) {
          return [position[0] - 0.5, position[1] - 0.5, position[2] - 0.5];
        }
        // Rotating around x axis, go back
        return [position[0] - 0.5, position[1] - 0.5, position[2] - 0.5];
      }
      return prev;
    });
    setGridRotation((prev) => {
      return (prev + 1) % cardinalRotations.length;
    });
  });

  const transform = useRef<TransformControlsImpl>(null);
  const [transformMode, setTransformMode] = useState<
    'rotate' | 'translate' | 'scale' | null
  >('translate');
  useEffect(() => {
    if (transform.current) {
      const controls = transform.current;
      controls.setMode(transformMode);
      const callback = (event: { value: unknown }) => {
        setDraggingTransform(!!event.value);
        setOrbitEnabled(!event.value);
      };
      // @ts-expect-error - types are wrong in addEventListener
      controls.addEventListener('dragging-changed', callback);
      // @ts-expect-error - types are wronng in addEventListener
      return () => controls.removeEventListener('dragging-changed', callback);
    }
  }, [transformMode, setOrbitEnabled]);

  useKeyPress('t', () => {
    setTransformMode('translate');
  });
  useKeyPress('r', () => {
    setTransformMode('rotate');
  });
  useKeyPress('s', () => {
    setTransformMode('scale');
  });
  useKeyPress('esc', () => {
    setShowCursor(false);
    setTransformMode(null);
  });

  useKeyPress('one', () => {
    setCursorRotation((prev) => [
      (prev[0] + Math.PI / 2) % (Math.PI * 2),
      0,
      0,
    ]);
  });
  useKeyPress('two', () => {
    setCursorRotation((prev) => [
      0,
      (prev[1] + Math.PI / 2) % (Math.PI * 2),
      0,
    ]);
  });
  useKeyPress('three', () => {
    setCursorRotation((prev) => [
      0,
      0,
      (prev[2] + Math.PI / 2) % (Math.PI * 2),
    ]);
  });
  useEffect(() => {
    const onRightClick = () => {
      setShowCursor(false);
    };
    window.addEventListener('contextmenu', onRightClick);
    return () => window.removeEventListener('contextmenu', onRightClick);
  }, [setShowCursor]);

  return (
    <group>
      <mesh
        position={new Vector3(...gridPosition)}
        rotation={new Euler(...wtfRotations[gridRotation])}
        onPointerMove={(e) => {
          setCursorPosition([e.point.x, e.point.y, e.point.z]);
        }}
      >
        <planeGeometry args={[20, 20]} />
        <meshBasicMaterial visible={false} side={DoubleSide} />
      </mesh>
      <Grid
        args={[20, 20]}
        position={new Vector3(...gridPosition)}
        rotation={new Euler(...cardinalRotations[gridRotation])}
        side={DoubleSide}
      />
      {showCursor && (
        <group position={cursorSnappedPosition} rotation={cursorRotation}>
          <mesh
            onClick={(e) => {
              addTile({
                ...defaultTiles[createType],
                id: makeId(),
                position: cursorSnappedPosition,
                rotation: cursorRotation,
                parentId: null,
              });
              autoSnap();
            }}
          >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial color={'red'} wireframe />
          </mesh>
          {createType === 'straight' ? (
            <Straightaway tile={defaultTiles.straight} opacity={0.25} />
          ) : createType === 'quarter' ? (
            <QuarterTurn tile={defaultTiles.quarter} opacity={0.25} />
          ) : createType === 't' ? (
            <Junction tile={defaultTiles.t} opacity={0.25} />
          ) : createType === 'button' ? (
            <Toggle tile={defaultTiles.button} opacity={0.25} />
          ) : createType === 'cap' ? (
            <Cap tile={defaultTiles.cap} opacity={0.25} />
          ) : createType === 'box' ? (
            <Box tile={defaultTiles.box} opacity={0.25} />
          ) : createType === 'sphere' ? (
            <Sphere tile={defaultTiles.sphere} opacity={0.25} />
          ) : createType === 'coin' ? (
            <Coin tile={defaultTiles.coin} opacity={0.25} />
          ) : createType === 'gate' ? (
            <Gate tile={defaultTiles.gate} opacity={0.25} />
          ) : createType === 'group' ? (
            <Group tile={defaultTiles.group} opacity={0.25} />
          ) : createType === 'friend' ? (
            <Friend tile={defaultTiles.friend} opacity={0.25} />
          ) : null}
        </group>
      )}
      {selectedTileId !== null &&
        tileRefs.get(selectedTileId) &&
        transformMode !== null && (
          <TransformControls
            mode={transformMode}
            translationSnap={0.25}
            rotationSnap={Math.PI / 4}
            scaleSnap={0.25}
            size={0.7}
            ref={transform}
            object={tileRefs.get(selectedTileId!)}
            onPointerOver={(e) => {
              setOverTransform(true);
            }}
            onPointerLeave={(e) => {
              setOverTransform(false);
            }}
            onChange={(e) => {
              const target = tileRefs.get(selectedTileId!);
              if (target) {
                const parent =
                  selectedTile!.parentId !== null
                    ? level!.tiles.find((t) => t.id === selectedTile!.parentId)
                    : null;
                updateTileAndRecompute(
                  selectedTileId!,
                  transformMode === 'translate'
                    ? {
                        position: [
                          target.position.x - (parent ? parent.position[0] : 0),
                          target.position.y - (parent ? parent.position[1] : 0),
                          target.position.z - (parent ? parent.position[2] : 0),
                        ],
                      }
                    : transformMode === 'rotate'
                      ? {
                          rotation: [
                            target.rotation.x,
                            target.rotation.y,
                            target.rotation.z,
                          ],
                        }
                      : transformMode === 'scale'
                        ? {
                            scale: [
                              target.scale.x,
                              target.scale.y,
                              target.scale.z,
                            ],
                          }
                        : {},
                );
                autoSnap();
              }
            }}
          />
        )}

      {level &&
        level.tiles.map((tile) => {
          const parent =
            tile.parentId !== null
              ? level.tiles.find((t) => t.id === tile.parentId)
              : null;
          return (
            <group
              key={tile.id}
              /* TransformControls are sensitive, any mouse event triggers a
                change even if there is no change. When there is a hover, the
                rotation is set to the target ref, which is this group, which is
                the invisible hover object. So even though this group isn't
                always visible, it stores the transform position and rotation.
                Something better would be to read the rotation ref from the
                tile itself. */
              position={
                tilesComputed[tile.id]?.position || [
                  // Boxes don't have computed positions! So re-add the parent
                  // offset
                  tile.position[0] + (parent ? parent.position[0] : 0),
                  tile.position[1] + (parent ? parent.position[1] : 0),
                  tile.position[2] + (parent ? parent.position[2] : 0),
                ]
              }
              rotation={tile.rotation}
              scale={tile.scale}
              ref={setTileRefs(tile.id)}
            >
              {targetTileIds?.includes(tile.id) && (
                <mesh>
                  <boxGeometry args={[1, 1, 1]} />
                  <meshBasicMaterial
                    color={'blue'}
                    transparent
                    opacity={0.25}
                  />
                </mesh>
              )}
              <mesh
                onClick={(e) => {
                  // Don't check while dragging to avoid mouseup on
                  // transformcontrols causing a click to select a different tile
                  if (
                    tile.id !== selectedTileId &&
                    !draggingTransform &&
                    !showCursor
                  ) {
                    e.stopPropagation();
                    setShowCursor(false);
                    setSelectedTileId(tile.id);
                  }
                }}
                onPointerOver={(e) => {
                  if (
                    tile.id !== hoverTileId &&
                    !draggingTransform &&
                    !overTransform &&
                    !showCursor
                  ) {
                    // e.stopPropagation();
                    setHoverTileId(tile.id);
                  }
                }}
                onPointerOut={(e) => {
                  if (tile.id === hoverTileId) {
                    // e.stopPropagation();
                    setHoverTileId(null);
                  }
                }}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial
                  visible={
                    tile.id === selectedTileId || tile.id === hoverTileId
                  }
                  opacity={tile.id === selectedTileId ? 0.3 : 0.2}
                  transparent
                  color={'green'}
                />
              </mesh>
            </group>
          );
        })}
    </group>
  );
};

export default Editor;
