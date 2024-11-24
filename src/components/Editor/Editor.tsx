'use client';

import { useEffect, useRef, useState } from 'react';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import { TransformControls, Grid, Html } from '@react-three/drei';

import {
  makeId,
  NumTrip,
  RailTile,
  Side,
  StrTrip,
  TileBase,
  useGameStore,
  useKeyPress,
} from '@/store/gameStore';

import cx from 'classnames';
import { useRefMap } from '@/util/react';
import { DoubleSide, Euler, Mesh, Vector3 } from 'three';

import styles from './editor.module.css';

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

const Editor = ({ setOrbitEnabled }: EditorProps) => {
  const level = useGameStore((state) => state.level);
  const selectedTileId = useGameStore((state) => state.selectedTileId);
  const setSelectedTileId = useGameStore((state) => state.setSelectedTileId);
  const hoverTileId = useGameStore((state) => state.hoverTileId);
  const setHoverTileId = useGameStore((state) => state.setHoverTileId);
  const updateTile = useGameStore((state) => state.updateTile);
  const addTile = useGameStore((state) => state.addTile);
  const deleteTile = useGameStore((state) => state.deleteTile);
  const showCursor = useGameStore((state) => state.showCursor);
  const setShowCursor = useGameStore((state) => state.setShowCursor);
  const createType = useGameStore((state) => state.createType);
  const [tileRefs, setTileRefs] = useRefMap();

  const selectedTile = level.find((tile) => tile.id === selectedTileId);

  const [gridPosition, setGridPosition] = useState([0, 0, 0]);
  const [gridRotation, setGridRotation] = useState(0);
  const [draggingTransform, setDraggingTransform] = useState(false);
  const [overTransform, setOverTransform] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<Triple>([0, 0, 0]);

  const cursorRef = useRef<Mesh>(null);

  const cursorSnappedPosition = cursorPosition.map((pos, i) => {
    return (
      Math.round(pos * 2.0) / 2.0 +
      (gridRotation === 0 && i == 1 ? 0.5 : 0) +
      (gridRotation === 1 && i == 2 ? 0.5 : 0) +
      (gridRotation === 2 && i == 0 ? 0.5 : 0)
    );
  }) as Triple;

  useKeyPress('add', () => {
    if (!showCursor) {
      setHoverTileId(null);
      setSelectedTileId(null);
    }
    setShowCursor(!showCursor);
  });

  useKeyPress('delete', () => {
    if (selectedTileId) {
      setSelectedTileId(null);
      deleteTile(selectedTileId);
    }
  });

  useKeyPress('gridRotate', () => {
    setGridPosition((prev) => {
      if (selectedTile) {
        // Rotate around y, go left
        if (gridRotation === 1) {
          return [
            selectedTile.position[0] - 0.5,
            selectedTile.position[1],
            selectedTile.position[2],
          ];
          // No rotation, go down
        } else if (gridRotation === 2) {
          return [
            selectedTile.position[0],
            selectedTile.position[1] - 0.5,
            selectedTile.position[2],
          ];
        }
        // Rotating around x axis, go back
        return [
          selectedTile.position[0],
          selectedTile.position[1],
          selectedTile.position[2] - 0.5,
        ];
      }
      return prev;
    });
    setGridRotation((prev) => {
      return (prev + 1) % cardinalRotations.length;
    });
  });

  const transform = useRef<TransformControlsImpl>(null);
  const [transformMode, setTransformMode] = useState('translate');
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

  useKeyPress('one', () => {
    setTransformMode('translate');
  });
  useKeyPress('two', () => {
    setTransformMode('rotate');
  });
  useKeyPress('three', () => {
    setTransformMode('scale');
  });

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
        <mesh
          ref={cursorRef}
          position={cursorSnappedPosition}
          onClick={(e) => {
            const base: TileBase = {
              id: makeId(),
              position: cursorSnappedPosition,
              rotation: [0, 0, 0],
              type: '',
            };
            if (createType === 'straight' || createType === 'quarter') {
              addTile({
                ...base,
                type: createType,
                showSides: 'all' as Side,
                connections: [null, null],
                entrances: [null, null],
              });
            } else if (createType === 't') {
              addTile({
                ...base,
                type: createType,
                showSides: 'all' as Side,
                connections: [null, null, null],
                entrances: [null, null, null],
              });
            } else if (createType === 'tark') {
              addTile({
                ...base,
                type: createType,
                actionType: 'toggle',
              });
            }
          }}
        >
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={'red'} wireframe />
        </mesh>
      )}
      {selectedTileId !== null && (
        <TransformControls
          mode="translate"
          translationSnap={0.5}
          size={0.7}
          ref={transform}
          object={tileRefs.get(selectedTileId)}
          rotationSnap={Math.PI / 4}
          onPointerOver={(e) => {
            setOverTransform(true);
          }}
          onPointerLeave={(e) => {
            setOverTransform(false);
          }}
          onChange={(e) => {
            const target = tileRefs.get(selectedTileId);
            if (target) {
              updateTile(
                selectedTileId,
                transformMode === 'translate'
                  ? {
                      position: [
                        target.position.x,
                        target.position.y,
                        target.position.z,
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
                    : {},
              );
            }
          }}
        ></TransformControls>
      )}

      {level.map((tile) => {
        return (
          <mesh
            key={tile.id}
            position={tile.position}
            onClick={(e) => {
              // Don't check while dragging to avoid mouseup on
              // transformcontrols causing a click to select a different tile
              if (tile.id !== selectedTileId && !draggingTransform) {
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
            ref={setTileRefs(tile.id)}
          >
            <Html className={cx('bg-slate-900', styles.idOverlay)}>
              {tile.id}
            </Html>
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial
              opacity={
                tile.id === selectedTileId
                  ? 0.3
                  : tile.id === hoverTileId
                    ? 0.2
                    : 0.01
              }
              transparent
              color={'green'}
            />
          </mesh>
        );
      })}
    </group>
  );
};

export const EditorUI = ({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) => {
  const hoverTileId = useGameStore((state) => state.hoverTileId);
  const selectedTileId = useGameStore((state) => state.selectedTileId);
  const level = useGameStore((state) => state.level);
  const selectedTile = level.find((tile) => tile.id === selectedTileId);
  const updateTile = useGameStore((state) => state.updateTile);
  const createType = useGameStore((state) => state.createType);
  const setCreateType = useGameStore((state) => state.setCreateType);
  const showCursor = useGameStore((state) => state.showCursor);
  const setShowCursor = useGameStore((state) => state.setShowCursor);

  useKeyPress('j', () => {
    setCreateType('t');
  });
  useKeyPress('s', () => {
    setCreateType('straight');
  });
  useKeyPress('q', () => {
    setCreateType('quarter');
  });

  return (
    <div
      className={cx('h-screen w-full', {
        'cursor-pointer': hoverTileId !== null,
      })}
    >
      {children}

      <div
        className={cx(
          styles.bottomToolbar,
          'bg-slate-900 text-sm flex gap-2 flex-row',
        )}
        style={{
          display: enabled ? '' : 'none',
        }}
      >
        <div className={cx(styles.toolbarItem, 'bg-gray-700')}>
          <div className="key">g</div> <div>Rotate Grid</div>
        </div>
        {selectedTileId && (
          <div className={cx(styles.toolbarItem, 'bg-gray-700')}>
            <div className="key">123</div> <div>Transform mode</div>
          </div>
        )}
        <div
          className={cx(styles.toolbarButton, 'bg-gray-700', {
            [styles.selected]: showCursor,
          })}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowCursor(!showCursor);
          }}
        >
          <div className="key">a</div> <div>Add</div>
        </div>
        {showCursor && [
          <div
            className={cx(styles.toolbarButton, 'bg-gray-700', {
              [styles.selected]: createType === 't',
            })}
            key="t"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setCreateType('t');
            }}
          >
            <div className="key">j</div> <div>Junction</div>
          </div>,
          <div
            className={cx(styles.toolbarButton, 'bg-gray-700', {
              [styles.selected]: createType === 'straight',
            })}
            key="str8"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setCreateType('straight');
            }}
          >
            <div className="key">s</div> <div>Straight</div>
          </div>,
          <div
            className={cx(styles.toolbarButton, 'bg-gray-700', {
              [styles.selected]: createType === 'quarter',
            })}
            key="q"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setCreateType('quarter');
            }}
          >
            <div className="key">q</div> <div>Turn</div>
          </div>,
        ]}
      </div>

      {/* Sidebar */}
      {selectedTile && selectedTileId && (
        <div
          className={cx(styles.sidebar, 'bg-slate-900')}
          style={{
            display: enabled ? '' : 'none',
          }}
        >
          <div className="mb-3">Id: {selectedTile.id}</div>
          <div className="mb-3">Type: {selectedTile.type}</div>
          {'connections' in selectedTile && (
            <div>
              <div className="mb-3">
                Connections: {selectedTile.connections.join(', ')}
              </div>
              <div className="mb-3">
                Entrances: {selectedTile.entrances.join(', ')}
              </div>
              <div className="mb-3">
                <label className="mb-1 block">Sides</label>
                <select
                  className={cx(styles.input, 'mb-2 w-full')}
                  value={selectedTile.showSides}
                  onChange={(e) => {
                    updateTile(selectedTileId, {
                      showSides: e.target.value as Side,
                    });
                  }}
                >
                  <option value="all">All</option>
                  <option value="top">Top</option>
                  <option value="bottom">Bottom</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="front">Front</option>
                  <option value="back">Back</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block">Connections</label>
                <div
                  className={cx(`grid gap-2`, {
                    'grid-cols-2': selectedTile.connections.length === 2,
                    'grid-cols-3': selectedTile.connections.length === 3,
                  })}
                >
                  {selectedTile.connections.map((connection, i) => {
                    return (
                      <div key={i}>
                        <label className="mb-1 block text-xs ">
                          Connection {i}
                        </label>
                        <input
                          className={cx(styles.input, 'mb-2 w-full')}
                          value={connection!}
                          onChange={(e) => {
                            updateTile(selectedTileId, {
                              connections: selectedTile.connections.map(
                                (c, j) => (i === j ? e.target.value : c),
                              ) as StrTrip,
                            });
                          }}
                          type="text"
                        />
                        <label className="mb-1 block text-xs">
                          Other Entrance
                        </label>
                        <select
                          className={cx(styles.input, 'mb-2 w-full')}
                          value={selectedTile.entrances[i]!}
                          onChange={(e) => {
                            updateTile(selectedTileId, {
                              entrances: selectedTile.entrances.map((c, j) =>
                                i === j ? parseInt(e.target.value) : c,
                              ) as NumTrip,
                            });
                          }}
                        >
                          {level
                            .find(
                              (tile): tile is RailTile =>
                                tile.id === connection,
                            )
                            ?.entrances.map((_, i) => {
                              return (
                                <option key={i} value={i}>
                                  {i}
                                </option>
                              );
                            })}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Editor;
