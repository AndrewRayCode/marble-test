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

import {
  INITIAL_SPHERE_RADIUS,
  PLAYER_SPEED,
  SPHERE_RADIUS,
  TILE_WIDTH,
} from '@/game/constants';
import {
  isRailTile,
  ScreenArrow,
  ScreenArrows,
  ButtonTile,
  TrackTile,
  useGameStore,
  useKeyPress,
  GateTile,
  RailTile,
} from '@/store/gameStore';
import { toScreen } from '@/util/math';
import OnScreenArrows from './OnScreenArrows';
import EditorComponent from './Editor/Editor';

import buttonSfx from '@/public/button.mp3';
import coinSfx from '@/public/coin.mp3';
import moneySfx from '@/public/money.mp3';
import errorSfx from '@/public/error.mp3';
import successSfx from '@/public/success.mp3';
import metalSfx from '@/public/metal-hit-17.mp3';
import metal2Sfx from '@/public/metal-hit-40.mp3';
import springboardSfx from '@/public/springboard.mp3';
import gadget1Sfx from '@/public/gadget-1.mp3';
import gadget2Sfx from '@/public/gadget-2.mp3';

import cx from 'classnames';
import Toggle from './Tiles/Toggle';
import Straightaway from './Tiles/Straightaway';
import QuarterTurn from './Tiles/QuarterTurn';
import Junction from './Tiles/Junction';
import { Level } from '@prisma/client';
import EditorUI from './Editor/EditorUI';
import Cap from './Tiles/Cap';
import Box from './Tiles/Box';
import Coin from './Tiles/Coin';
import Gate, { GATE_DEPTH } from './Tiles/Gate';
import Sphere from './Tiles/Sphere';
import Group from './Tiles/Group';

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
  const debugPoints = useGameStore((state) => state.debugPoints);
  const toggleDebug = useGameStore((state) => state.toggleDebug);
  const resetLevel = useGameStore((state) => state.resetLevel);
  const setScreenArrows = useGameStore((state) => state.setScreenArrows);
  const setCurveProgress = useGameStore((state) => state.setCurveProgress);
  const setCurrentTileId = useGameStore((state) => state.setCurrentTileId);
  const currentCurveIndex = useGameStore((state) => state.currentCurveIndex);
  const levels = useGameStore((state) => state.levels);
  const setCurrentLevelId = useGameStore((state) => state.setCurrentLevelId);
  const setCurrentCurveIndex = useGameStore(
    (state) => state.setCurrentCurveIndex,
  );
  const debug = useGameStore((state) => state.debug);
  const currentTileId = useGameStore((state) => state.currentTileId);
  const currentLevelId = useGameStore((state) => state.currentLevelId);
  const setMomentum = useGameStore((state) => state.setMomentum);
  const setEnteredFrom = useGameStore((state) => state.setEnteredFrom);
  const setNextConnection = useGameStore((state) => state.setNextConnection);
  const gameStarted = useGameStore((state) => state.gameStarted);
  const setGameStarted = useGameStore((state) => state.setGameStarted);
  const isEditing = useGameStore((state) => state.isEditing);
  const setIsEditing = useGameStore((state) => state.setIsEditing);
  const tilesComputed = useGameStore((state) => state.tilesComputed);
  const collectedItems = useGameStore((state) => state.collectedItems);
  const bonkBackTo = useGameStore((state) => state.bonkBackTo);

  const marbleRef = useRef<Mesh>(null);
  const orbit = useRef<OrbitControlsImpl>(null);
  const { camera, viewport } = useThree();

  const level = useMemo(() => {
    if (currentLevelId) {
      return levels.find((l) => l.id === currentLevelId);
    }
  }, [levels, currentLevelId]);

  const currentTile = useMemo(() => {
    if (currentTileId && level) {
      return level.tiles.find((t): t is TrackTile => t.id === currentTileId);
    }
  }, [currentTileId, level]);

  const currentCurve = useMemo(() => {
    if (currentTile) {
      return tilesComputed[currentTile.id]?.curves?.[currentCurveIndex];
    }
  }, [currentTile, currentCurveIndex, tilesComputed]);

  const arrowPositions = useMemo(
    () =>
      currentTile?.type === 't'
        ? tilesComputed[currentTile.id].exits
        : currentTile?.type === 'cap'
          ? [tilesComputed[currentTile.id]?.curves[0].getPointAt(0)]
          : bonkBackTo
            ? [new Vector3(...bonkBackTo.lastExit)]
            : [],
    [tilesComputed, currentTile, bonkBackTo],
  );

  useKeyPress('edit', () => setIsEditing(!isEditing));
  useKeyPress('debug', toggleDebug);
  useKeyPress('backslash', () => {
    resetLevel();
  });

  const [playBtnSfx] = useSound(buttonSfx, { volume: 0.5 });
  const [playCoinSfx] = useSound(coinSfx, { volume: 0.15 });
  const [playMoneySfx] = useSound(moneySfx, { volume: 1 });
  const [playErrorSfx] = useSound(errorSfx, { volume: 1 });
  const [playSuccessSfx] = useSound(successSfx, { volume: 1 });
  const [playMetalHitSfx] = useSound(metalSfx, { volume: 0.1 });
  const [playMetalHit2Sfx] = useSound(metal2Sfx, { volume: 0.05 });
  const [playSpringboardSfx] = useSound(springboardSfx, { volume: 0.75 });
  const [playGadget1Sfx] = useSound(gadget1Sfx, { volume: 0.25 });
  const [playGadget2Sfx] = useSound(gadget2Sfx, { volume: 0.25 });

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

    let progress = clamp(
      s.curveProgress +
        s.playerMomentum *
          delta *
          (currentTile.type === 'cap'
            ? 4.0
            : currentTile.type === 't'
              ? 2.0
              : 1.0),
      0,
      1,
    );

    setCurveProgress(progress);

    if (marbleRef.current && currentCurve && currentTile) {
      // if (s.playerMomentum === 0) {
      //   if (key().up) {
      //     setMomentum(PLAYER_SPEED);
      //   } else if (key().down) {
      //     setMomentum(-PLAYER_SPEED);
      //   }
      // }

      // Get the point along the curve
      let point = currentCurve.getPointAt(progress);

      // Update the sphere's position
      marbleRef.current.position.copy(point);

      level.tiles
        .filter((t) => t.type === 'coin' && !s.collectedItems.has(t.id))
        .forEach((coin) => {
          const isNear =
            point.distanceTo(new Vector3(...coin.position)) <
            INITIAL_SPHERE_RADIUS;
          if (isNear) {
            playCoinSfx();
            playMoneySfx();
            s.collectItem(coin.id);
          }
        });

      const gateCollisionDistance = SPHERE_RADIUS + GATE_DEPTH / 2;
      // Check for switch presses
      level.tiles
        .filter((t): t is GateTile => {
          if (
            t.type === 'gate' &&
            (s.gateStates[t.id] === 'closed' ||
              (!(t.id in s.gateStates) && t.defaultState === 'closed'))
          ) {
            const gp = new Vector3(...t.position);
            const currentDistance = point.distanceTo(gp);
            return currentDistance <= gateCollisionDistance;
          }
          return false;
        })
        .forEach((gate) => {
          const gp = new Vector3(...gate.position);
          let ef = s.tilesComputed[currentTile.id]?.exits?.[s.enteredFrom];

          // If this is a T junction and we came from the middle, the exited
          // from tile won't have a position, so set it to the middle of the T
          if (currentTile.type === 't' && s.enteredFrom === -1) {
            ef = s.tilesComputed[currentTile.id]?.curves[0].getPointAt(1);
          }

          if (ef && s.playerMomentum !== 0) {
            playErrorSfx();
            const entranceToGate = ef.distanceTo(gp);

            let newProgress = progress;

            if (currentTile.type === 't') {
              // Figure out how much along this curve we need to go, and then
              // double it, because T junction tiles are only half width!
              const progressToSnapTo =
                (TILE_WIDTH - gateCollisionDistance) * 2.0;
              // Then reverse it again, because if we are leaving a T, we are
              // travelling in the negative direction, so the point on the
              // curve we want to bonk at is inverted
              newProgress = clamp(TILE_WIDTH - progressToSnapTo, 0, 1);
            } else {
              // Otherwise, take the entrance to the gate, and go back the
              // collision distance, to determine snap position. Negate it if
              // going negative direction.
              const snappedDistance = entranceToGate - gateCollisionDistance;
              newProgress = clamp(
                s.playerMomentum < 0
                  ? TILE_WIDTH - snappedDistance
                  : snappedDistance,
                0,
                1,
              );
            }

            const newPoint = currentCurve.getPointAt(newProgress);
            setMomentum(0);
            s.setBonkBackTo({
              nextDirection: s.playerMomentum < 0 ? 1 : -1,
              lastExit: ef.toArray(),
            });
            point = newPoint;
            marbleRef.current!.position.copy(point);
            progress = newProgress;
            setCurveProgress(newProgress);
          }
        });

      // Check for switch presses
      level.tiles
        .filter((t): t is ButtonTile => t.type === 'button')
        .forEach((button) => {
          const isNear =
            point.distanceTo(new Vector3(...button.position)) < 0.5;
          const on = s.booleanSwitches[button.id];
          const enabled =
            s.enabledBooleanSwitchesFor[-1]?.[button.id] !== false;
          const { actions } = button;

          // Rolling over action triggers each time, and rolling away resets
          // the button itself (independent of the action)
          if (button.actionType === 'click') {
            if (enabled && isNear) {
              playBtnSfx();
              s.setEnabledBooleanSwitchesFor(-1, button.id, false);

              actions.forEach((action) => {
                playGadget1Sfx();
                playGadget2Sfx();
                s.applyAction(currentTile, action);
              });
            } else if (!enabled && !isNear) {
              s.setEnabledBooleanSwitchesFor(-1, button.id, true);
            }
            // Roling over the button triggers the action each time, and the button
            // state stays in this state until hit again, independent of the action
          } else if (button.actionType === 'toggle') {
            if (enabled && isNear) {
              playBtnSfx();
              s.setEnabledBooleanSwitchesFor(-1, button.id, false);
              s.setBooleanSwitch(button.id, !on);

              if (!on) {
                actions.forEach((action) => {
                  s.applyAction(currentTile, action);
                });
              } else {
                actions.forEach((action) => {
                  s.clearAction(currentTile, action);
                });
              }
            } else if (!enabled && !isNear) {
              s.setEnabledBooleanSwitchesFor(-1, button.id, true);
            }
            // Need to stay over
          } else if (button.actionType === 'hold') {
            if (enabled && isNear) {
              playBtnSfx();
              s.setEnabledBooleanSwitchesFor(-1, button.id, false);
              s.setBooleanSwitch(button.id, !on);
              actions.forEach((action) => {
                s.applyAction(currentTile, action);
              });
            }
            if (!enabled && !isNear) {
              playBtnSfx();
              s.setEnabledBooleanSwitchesFor(-1, button.id, true);
              s.setBooleanSwitch(button.id, !on);

              actions.forEach((action) => {
                s.clearAction(currentTile, action);
              });
            }
          }
        });

      const isDown = key().down && directions.down;
      const isLeft = key().left && directions.left;
      const isRight = key().right && directions.right;
      const isUp = key().up && directions.up;
      const isValidUserChoosenDirection = isDown || isLeft || isRight || isUp;

      if (s.bonkBackTo && isValidUserChoosenDirection) {
        setMomentum(s.bonkBackTo.nextDirection * PLAYER_SPEED);
        s.clearBonkBackTo();
      }

      let nextTile: TrackTile | undefined;
      let nextIdx: number | null | undefined;
      let nextId: string | null | undefined;
      let nextEntrance: number | null | undefined;

      // We are the end of this curve in our direction of travel
      if ((progress >= 1.0 && isPositive) || (progress <= 0 && !isPositive)) {
        // We have landed on the junction in the middle of the T
        if (currentTile.type === 'cap') {
          // We are leaving
          if (s.nextConnection === 0) {
            nextId = currentTile.connections[0];
            nextEntrance = currentTile.entrances[0];
            // We hit the center of the cap
          } else if (isValidUserChoosenDirection) {
            setEnteredFrom(-1);
            setNextConnection(0);
            setMomentum(-PLAYER_SPEED);
            setCurveProgress(1.0);
          } else if (s.playerMomentum !== 0) {
            setMomentum(0);
            playMetalHitSfx();
            playMetalHit2Sfx();
          }
        } else if (currentTile.type == 't') {
          // We are going towards, and have landed on, the center
          if (s.nextConnection === -1) {
            let nextConnection: number | undefined;
            if (isValidUserChoosenDirection) {
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
              if (s.enteredFrom === 1) {
                playMetalHitSfx();
                playMetalHit2Sfx();
              }
              setMomentum(0);
            }
            // We are getting the hell out of here
          } else if (s.enteredFrom === -1) {
            nextId = currentTile.connections[s.nextConnection!];
            nextEntrance = currentTile.entrances[s.nextConnection!];

            if (!nextId || nextEntrance === undefined) {
              playSpringboardSfx();
              setMomentum(s.playerMomentum > 0 ? -PLAYER_SPEED : PLAYER_SPEED);
              setEnteredFrom(s.nextConnection!);
              setNextConnection(-1);
              // Another an option
              // s.resetLevel();
            }
          }
        } else {
          // We're on a straightaway

          // Positive momentum means we choose this tile's last exit
          nextIdx = isPositive ? 1 : 0;
          nextId = currentTile.connections[nextIdx];
          nextEntrance = currentTile.entrances[nextIdx];

          if (!nextId || nextEntrance === undefined) {
            playSpringboardSfx();
            setMomentum(s.playerMomentum > 0 ? -PLAYER_SPEED : PLAYER_SPEED);
            setEnteredFrom(s.nextConnection!);
            setNextConnection(s.nextConnection === 0 ? 1 : 0);
          }
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

          setCurrentTileId(nextTile.id);

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

      const coins = level.tiles.filter((t) => t.type === 'coin');
      if (
        coins.length &&
        coins.filter((t) => !s.collectedItems.has(t.id)).length === 0
      ) {
        playSuccessSfx();
        const idx = levels.findIndex((l) => l.id === currentLevelId);
        const nextIndex = (idx + 1) % levels.length;
        setCurrentLevelId(levels[nextIndex].id!);
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
        backgroundBlurriness={0.3}
      />

      {/* Player */}
      <mesh ref={marbleRef}>
        <sphereGeometry args={[SPHERE_RADIUS, 128, 128]} />
        <meshStandardMaterial
          metalness={0.4}
          roughness={0.01}
          envMapIntensity={0.5}
          emissive={0x333333}
        />
      </mesh>

      {debugPoints.map((point, i) => (
        <mesh key={i} position={point.position}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={point.color} />
        </mesh>
      ))}
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
        level.tiles
          .filter((t) => t.parentId === undefined || t.parentId === null)
          .map((tile) => {
            if (tile.type === 'group') {
              return <Group key={tile.id} tile={tile} />;
            } else if (tile.type === 'straight') {
              return <Straightaway key={tile.id} tile={tile} />;
            } else if (tile.type === 'quarter') {
              return <QuarterTurn key={tile.id} tile={tile} />;
            } else if (tile.type === 't') {
              return <Junction key={tile.id} tile={tile} />;
            } else if (tile.type === 'button') {
              return <Toggle key={tile.id} tile={tile} />;
            } else if (tile.type === 'cap') {
              return <Cap key={tile.id} tile={tile} />;
            } else if (tile.type === 'box') {
              return <Box key={tile.id} tile={tile} />;
            } else if (tile.type === 'sphere') {
              return <Sphere key={tile.id} tile={tile} />;
            } else if (tile.type === 'coin') {
              return (
                <Coin
                  key={tile.id}
                  tile={tile}
                  visible={!collectedItems.has(tile.id)}
                />
              );
            } else if (tile.type === 'gate') {
              return <Gate key={tile.id} tile={tile} />;
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
          const offset = level.tiles.find((t) => t.id === tile.parentId)
            ?.position || [0, 0, 0];
          return (
            <group key={tile.id}>
              {tile.type !== 'box' && tile.type !== 'sphere' && (
                <Html
                  className={cx('bg-slate-900 idOverlay')}
                  position={[
                    tile.position[0] + offset[0],
                    tile.position[1] + offset[1],
                    tile.position[2] + offset[2],
                  ]}
                >
                  {tile.id}
                </Html>
              )}
              {isRailTile(tile) ? (
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
              ) : (
                <group>
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
              )}
            </group>
          );
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
          // Editor shortcuts, since you can't stack keyboardcontrols
          { name: 'edit', keys: ['e'] },
          { name: 'a', keys: ['a'] },
          { name: 'one', keys: ['1'] },
          { name: 'two', keys: ['2'] },
          { name: 'three', keys: ['3'] },
          { name: 'j', keys: ['j'] },
          { name: 's', keys: ['s'] },
          { name: 'q', keys: ['q'] },
          { name: 'b', keys: ['b'] },
          { name: 'c', keys: ['c'] },
          { name: 'r', keys: ['r'] },
          { name: 'x', keys: ['x'] },
          { name: 't', keys: ['t'] },
          { name: 'g', keys: ['g'] },
          { name: 'm', keys: ['m'] },
          { name: 'esc', keys: ['Escape'] },
          { name: 'backslash', keys: ['Backslash'] },
        ]}
      >
        <EditorUI enabled={isEditing}>
          <Canvas
            // orthographic
            // camera={{ zoom: 50, position: [0, 0, 100] }}
            camera={{ position: [0, 0, 5] }}
            className="h-full w-full"
          >
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
