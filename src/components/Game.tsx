'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSound from 'use-sound';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Mesh, Vector2, Vector3 } from 'three';
import { clamp } from 'three/src/math/MathUtils.js';
import { Canvas, useThree } from '@react-three/fiber';
import {
  Environment,
  OrbitControls,
  Html,
  KeyboardControls,
  useKeyboardControls,
} from '@react-three/drei';
import { useFrame } from '@react-three/fiber';

import { PLAYER_SPEED, SPHERE_RADIUS } from '@/game/constants';
import {
  isRailTile,
  ScreenArrow,
  ScreenArrows,
  TarkTile,
  Tile,
  TrackTile,
  useGameStore,
  useKeyPress,
} from '@/store/gameStore';
import { toScreen } from '@/util/math';
import OnScreenArrows from './OnScreenArrows';
import EditorComponent, { EditorUI } from './Editor/Editor';

import buttonSfx from '@/public/button.mp3';

import cx from 'classnames';
import Toggle from './Tiles/Toggle';
import Straightaway from './Tiles/Straightaway';
import QuarterTurn from './Tiles/QuarterTurn';
import Junction from './Tiles/Junction';
import { Level } from '@prisma/client';
import { JsonObject } from '@prisma/client/runtime/library';

const lowest = (a: {
  left: number;
  right: number;
  up: number;
  down: number;
}): 'left' | 'right' | 'up' | 'down' => {
  const { left, right, up, down } = a;
  if (left < right && left < up && left < down) {
    return 'left';
  }
  if (right < left && right < up && right < down) {
    return 'right';
  }
  if (up < left && up < right && up < down) {
    return 'up';
  }
  return 'down';
};

const screenLeft = new Vector2(-1, 0);
const screenRight = new Vector2(1, 0);
const screenUp = new Vector2(0, -1);
const screenDown = new Vector2(0, 1);

type GameProps = {
  dbLevels: Level[];
};

const Game = () => {
  const [, key] = useKeyboardControls();

  const buddies = useGameStore((state) => state.buddies);
  const toggleDebug = useGameStore((state) => state.toggleDebug);
  const resetLevel = useGameStore((state) => state.resetLevel);
  const setScreenArrows = useGameStore((state) => state.setScreenArrows);
  const setCurveProgress = useGameStore((state) => state.setCurveProgress);
  const setCurrentTile = useGameStore((state) => state.setCurrentTile);
  const currentCurveIndex = useGameStore((state) => state.currentCurveIndex);
  const levels = useGameStore((state) => state.levels);
  const setCurrentCurveIndex = useGameStore(
    (state) => state.setCurrentCurveIndex,
  );
  const debug = useGameStore((state) => state.debug);
  const currentTile = useGameStore((state) => state.currentTile);
  const currentLevelId = useGameStore((state) => state.currentLevelId);
  const setMomentum = useGameStore((state) => state.setMomentum);
  const setEnteredFrom = useGameStore((state) => state.setEnteredFrom);
  const setNextConnection = useGameStore((state) => state.setNextConnection);
  const gameStarted = useGameStore((state) => state.gameStarted);
  const setGameStarted = useGameStore((state) => state.setGameStarted);
  const isEditing = useGameStore((state) => state.isEditing);
  const setIsEditing = useGameStore((state) => state.setIsEditing);
  const tilesComputed = useGameStore((state) => state.tilesComputed);

  const marbleRef = useRef<Mesh>(null);
  const orbit = useRef<OrbitControlsImpl>(null);
  const { camera, viewport } = useThree();

  const currentCurve = useMemo(() => {
    if (currentTile) {
      return tilesComputed[currentTile.id]?.curves?.[currentCurveIndex];
    }
  }, [currentTile, currentCurveIndex, tilesComputed]);

  const arrowPositions = useMemo(
    () =>
      currentTile?.type === 't' ? tilesComputed[currentTile.id].exits : [],
    [tilesComputed, currentTile],
  );

  const level = useMemo(() => {
    if (currentLevelId) {
      return levels.find((l) => l.id === currentLevelId);
    }
  }, [levels, currentLevelId]);

  useKeyPress('edit', () => setIsEditing(!isEditing));
  useKeyPress('debug', toggleDebug);
  useKeyPress('reset', () => {
    console.log('Resetting game!');
    resetLevel();
  });

  const [playBtnSfx] = useSound(buttonSfx, { volume: 0.5 });

  // Start game :(
  useEffect(() => {
    if (!gameStarted) {
      setGameStarted(true);
      console.log('Starting game');
      resetLevel();
    }
  }, [gameStarted, setGameStarted, resetLevel]);

  useFrame((state, delta) => {
    const s = useGameStore.getState();

    if (!level || !currentTile) {
      return;
    }

    const tileScreen = toScreen(
      new Vector3(...currentTile.position),
      camera,
      viewport,
    );

    const entranceDistances = arrowPositions.map((position, entrance) => {
      const screen = toScreen(position, camera, viewport);
      // Create vector pointing from marble to entrance
      const v = new Vector2(screen.x - tileScreen.x, screen.y - tileScreen.y);
      return {
        entrance,
        position,
        left: screenLeft.angleTo(v),
        right: screenRight.angleTo(v),
        up: screenUp.angleTo(v),
        down: screenDown.angleTo(v),
      };
    });

    const seen = new Set<string>();
    const arrowsForEntrances = entranceDistances.reduce((acc, d) => {
      // Figure out which cardinal direction this is most pointing
      const arrow = lowest(d);
      // Only one entrance per cardinal direction!
      if (!seen.has(arrow)) {
        seen.add(arrow);
        return acc.concat({
          d: 0,
          position: d.position,
          entrance: d.entrance,
          arrow: lowest(d),
        });
      }
      return acc;
    }, [] as ScreenArrows);

    setScreenArrows(arrowsForEntrances);

    const directions = arrowsForEntrances.reduce(
      (acc, arrow) => {
        acc[arrow.arrow] = arrow;
        return acc;
      },
      {} as Record<string, ScreenArrow>,
    );

    const isPositive = s.playerMomentum >= 0;

    // Type safe bail-out for later, like falling out of level
    if (!currentTile) {
      return;
    }

    const progress = clamp(
      s.curveProgress +
        s.playerMomentum * delta * (currentTile.type === 't' ? 2.0 : 1.0),
      0,
      1,
    );

    setCurveProgress(progress);

    if (marbleRef.current && currentCurve && currentTile) {
      if (s.playerMomentum === 0) {
        if (key().up) {
          setMomentum(PLAYER_SPEED);
        } else if (key().down) {
          setMomentum(-PLAYER_SPEED);
        }
      }

      // Get the point along the curve
      const point = currentCurve.getPointAt(progress);

      // Update the sphere's position
      marbleRef.current.position.copy(point);

      // Check for switch presses
      level.tiles
        .filter((t): t is TarkTile => t.type === 'tark')
        .forEach((tark) => {
          const isNear = point.distanceTo(new Vector3(...tark.position)) < 0.2;
          const on = s.booleanSwitches[tark.id];
          const enabled = s.enabledBooleanSwitchesFor[-1]?.[tark.id] !== false;
          const { action } = tark;

          // Rolling over action triggers each time
          if (tark.actionType === 'click') {
            if (enabled && isNear) {
              playBtnSfx();
              s.setEnabledBooleanSwitchesFor(-1, tark.id, false);
              s.setBooleanSwitch(tark.id, !on);

              if (action) {
                s.applyAction(action);
              }
            } else if (!enabled && !isNear) {
              s.setEnabledBooleanSwitchesFor(-1, tark.id, true);
            }
          } else if (tark.actionType === 'toggle') {
            if (enabled && isNear) {
              playBtnSfx();
              s.setEnabledBooleanSwitchesFor(-1, tark.id, false);
              s.setBooleanSwitch(tark.id, !on);

              if (action) {
                if (isNear) {
                  s.applyAction(action);
                } else {
                  action.targetTiles.forEach((tileId) => {
                    s.clearTransform(tileId, action.type);
                  });
                }
              }
            } else if (!enabled && !isNear) {
              s.setEnabledBooleanSwitchesFor(-1, tark.id, true);
            }
            // Need to stay over
          } else if (tark.actionType === 'hold') {
            if (enabled && isNear) {
              playBtnSfx();
              s.setEnabledBooleanSwitchesFor(-1, tark.id, false);
              s.setBooleanSwitch(tark.id, !on);
              if (action) {
                s.applyAction(action);
              }
            }
            if (!enabled && !isNear) {
              playBtnSfx();
              s.setEnabledBooleanSwitchesFor(-1, tark.id, true);
              s.setBooleanSwitch(tark.id, !on);

              if (action) {
                action.targetTiles.forEach((tileId) => {
                  s.clearTransform(tileId, action.type);
                });
              }
            }
          }
        });

      let nextTile: TrackTile | undefined;
      let nextIdx: number | null | undefined;
      let nextId: string | null | undefined;
      let nextEntrance: number | null | undefined;

      // We are the end of this curve in our direction of travel
      if ((progress >= 1.0 && isPositive) || (progress <= 0 && !isPositive)) {
        // We have landed on the junction in the middle of the T
        if (currentTile.type == 't') {
          // We are going towards, and have landed on, the center
          if (s.nextConnection === -1) {
            const isDown = key().down && directions.down;
            const isLeft = key().left && directions.left;
            const isRight = key().right && directions.right;
            const isUp = key().up && directions.up;

            let nextConnection: number | undefined;
            if (isDown || isLeft || isRight || isUp) {
              nextConnection = isDown
                ? directions.down.entrance
                : isLeft
                  ? directions.left.entrance
                  : isRight
                    ? directions.right.entrance
                    : directions.up.entrance;
            }

            // auto continue through
            // const noKey = !isDown && !isLeft && !isRight && !isUp;
            // const autoLeft = enteredFrom === 2 && noKey;
            // const autoRight = enteredFrom === 0 && noKey;
            // if (autoLeft || autoRight) {
            //   nextConnection = autoLeft ? 0 : 1;
            // }

            if (nextConnection !== undefined) {
              // Start from the T junction
              setEnteredFrom(-1);

              setNextConnection(nextConnection);
              // We are moving out from T so negative momentum
              setMomentum(-PLAYER_SPEED);
              setCurrentCurveIndex(nextConnection);
              // Start at the far end of the curve!
              setCurveProgress(1.0);
              // We are at the t junction, we came from the bottom, and no keys
              // were pressed, so stop!
            } else if (s.playerMomentum !== 0) {
              setMomentum(0);
            }
            // We are getting the hell out of here
          } else if (s.enteredFrom === -1) {
            nextId = currentTile.connections[s.nextConnection!];
            nextEntrance = currentTile.entrances[s.nextConnection!];
          }
        } else {
          // We're on a straightaway

          // Positive momentum means we choose this tile's last exit
          nextIdx = isPositive ? 1 : 0;
          nextId = currentTile.connections[nextIdx];
          nextEntrance = currentTile.entrances[nextIdx];
        }

        // If we detected there is somewhere to go...
        if (nextId !== undefined || nextEntrance !== undefined) {
          if (nextId === null || nextEntrance == null) {
            console.log('no next!');
            // fall out of level!
            return;
          } else {
            nextTile = level.tiles.find(
              (tile): tile is TrackTile => tile.id === nextId,
            )!;
          }

          if (!nextTile) {
            console.error('bad next tile', { currentTile, level });
            throw new Error('bad next tile');
          }

          setCurrentTile(nextTile);

          // If connecting to a striaght tile
          if (isRailTile(nextTile)) {
            setCurrentCurveIndex(0);
            setEnteredFrom(nextEntrance);
            // Go towards other connection
            setNextConnection(nextEntrance === 0 ? 1 : 0);
            // If we entered from direction of travel, go positive. Otherwise go negative
            setMomentum(nextEntrance === 0 ? PLAYER_SPEED : -PLAYER_SPEED);
            setCurveProgress(nextEntrance === 0 ? 0 : 1);
            // If connecting to a T junction
          } else if (nextTile.type === 't') {
            setCurrentCurveIndex(nextEntrance);
            setEnteredFrom(nextEntrance);
            // We are entering a choice tile - the next connection is t center
            setNextConnection(-1);
            // All T junction tile curves point inward so go positive
            setMomentum(PLAYER_SPEED);
            setCurveProgress(0);
          }
        }
      }
    }
  });

  return (
    <group>
      <color attach="background" args={['white']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Environment
        files="/envmaps/room.hdr"
        background
        backgroundBlurriness={0.5}
      />

      {/* Player */}
      <mesh ref={marbleRef}>
        <sphereGeometry args={[SPHERE_RADIUS, 256, 256]} />
        <meshStandardMaterial
          metalness={0.4}
          roughness={0.01}
          envMapIntensity={0.5}
          emissive={0x333333}
        />
      </mesh>

      {debug &&
        buddies.map(([b1, b2], i) => (
          <group key={i}>
            <mesh
              position={[
                b1.position[0] + Math.random() * 0.1,
                b1.position[1],
                b1.position[2] + Math.random() * 0.1,
              ]}
            >
              <sphereGeometry args={[0.1, 16, 16]} />
              <meshStandardMaterial color="red" transparent opacity={0.5} />
            </mesh>
            {b2 && (
              <mesh
                position={[
                  b2.position[0] - Math.random() * 0.1,
                  b2.position[1],
                  b2.position[2] - Math.random() * 0.1,
                ]}
              >
                <sphereGeometry args={[0.1, 16, 16]} />
                <meshStandardMaterial color="blue" transparent opacity={0.5} />
              </mesh>
            )}
          </group>
        ))}

      {/* On-screen arrows */}
      <OnScreenArrows />

      {level &&
        level.tiles.map((tile) => {
          if (tile.type === 'straight') {
            return <Straightaway key={tile.id} tile={tile} />;
          } else if (tile.type === 'quarter') {
            return <QuarterTurn key={tile.id} tile={tile} />;
          } else if (tile.type === 't') {
            return <Junction key={tile.id} tile={tile} />;
          } else if (tile.type === 'tark') {
            return <Toggle key={tile.id} tile={tile} />;
          }
        })}

      {isEditing && (
        <EditorComponent
          setOrbitEnabled={(e) => (orbit.current!.enabled = e)}
        />
      )}

      {debug &&
        level &&
        level.tiles.map((tile) => {
          if (isRailTile(tile)) {
            return (
              <mesh key={tile.id}>
                <Html className="bg-slate-900 p-1" position={tile.position}>
                  {tile.id}
                </Html>
                <tubeGeometry
                  args={[
                    tilesComputed[tile.id]?.curves?.[0],
                    70,
                    0.01,
                    50,
                    false,
                  ]}
                />
                <meshStandardMaterial color="blue" wireframe />
              </mesh>
            );
          } else if (tile.type === 't') {
            return (
              <group key={tile.id}>
                <Html className="bg-slate-900 p-1" position={tile.position}>
                  {tile.id}
                </Html>
                <mesh>
                  <tubeGeometry
                    args={[
                      tilesComputed[tile.id]?.curves?.[0],
                      70,
                      0.01,
                      50,
                      false,
                    ]}
                  />
                  <meshStandardMaterial color="blue" wireframe />
                </mesh>
                <mesh>
                  <tubeGeometry
                    args={[
                      tilesComputed[tile.id]?.curves?.[1],
                      70,
                      0.01,
                      50,
                      false,
                    ]}
                  />
                  <meshStandardMaterial color="blue" wireframe />
                </mesh>
                <mesh>
                  <tubeGeometry
                    args={[
                      tilesComputed[tile.id]?.curves?.[2],
                      70,
                      0.01,
                      50,
                      false,
                    ]}
                  />
                  <meshStandardMaterial color="blue" wireframe />
                </mesh>
              </group>
            );
          }
        })}

      {debug && currentTile && (
        <mesh position={currentTile.position}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="red" opacity={0.5} transparent />
        </mesh>
      )}
      <OrbitControls ref={orbit} />
    </group>
  );
};

export default function ThreeScene({ dbLevels }: GameProps) {
  const playerMomentum = useGameStore((state) => state.playerMomentum);
  // const curveProgress = useStore((state) => state.curveProgress);
  const isEditing = useGameStore((state) => state.isEditing);
  const debug = useGameStore((state) => state.debug);
  const levels = useGameStore((state) => state.levels);
  const currentLevelId = useGameStore((state) => state.currentLevelId);
  const setaCurrentLevelId = useGameStore((state) => state.setCurrentLevelId);
  const setLevelsFromDb = useGameStore((state) => state.setLevelsFromDb);
  const setInputFocused = useGameStore((state) => state.setIsInputFocused);

  const [fetched, setHasFetched] = useState(false);

  // This is an anti-pattern. Replace with server action?
  useEffect(() => {
    if (!fetched) {
      setHasFetched(true);
      setLevelsFromDb(dbLevels);
      if (dbLevels.length > 0) {
        setaCurrentLevelId(dbLevels[0].id);
      }
    }
  }, [
    currentLevelId,
    levels,
    dbLevels,
    setLevelsFromDb,
    setaCurrentLevelId,
    fetched,
  ]);

  useEffect(() => {
    const focus = () => setInputFocused(true);
    const blur = () => setInputFocused(false);
    document.body.addEventListener('focusin', focus);
    document.body.addEventListener('focusout', blur);
    return () => {
      document.body.removeEventListener('focusin', focus);
      document.body.removeEventListener('focusout', blur);
    };
  }, [setInputFocused]);

  return (
    <div className={cx('h-screen w-full bg-gray-900')}>
      <KeyboardControls
        map={[
          { name: 'up', keys: ['ArrowUp'] },
          { name: 'down', keys: ['ArrowDown'] },
          { name: 'left', keys: ['ArrowLeft'] },
          { name: 'right', keys: ['ArrowRight'] },
          { name: 'debug', keys: ['d'] },
          { name: 'reset', keys: ['r'] },
          // Editor shortcuts, since you can't stack keyboardcontrols
          { name: 'edit', keys: ['e'] },
          { name: 'gridRotate', keys: ['g'] },
          { name: 'add', keys: ['a'] },
          { name: 'delete', keys: ['x'] },
          { name: 'one', keys: ['1'] },
          { name: 'two', keys: ['2'] },
          { name: 'three', keys: ['3'] },
          { name: 'j', keys: ['j'] },
          { name: 's', keys: ['s'] },
          { name: 'q', keys: ['q'] },
        ]}
      >
        <EditorUI enabled={isEditing}>
          <Canvas camera={{ position: [0, 0, 6] }} className="h-full w-full">
            <Game />
          </Canvas>
          {debug && (
            <div className="absolute bottom-0 right-0 h-16 w-64 z-2 bg-slate-900 shadow-lg rounded-lg p-2 text-sm">
              <div>momentum: {playerMomentum}</div>
              {/* <div>curve progress: {Math.round(curveProgress * 10) / 10}</div> */}
            </div>
          )}
        </EditorUI>
      </KeyboardControls>
    </div>
  );
}
