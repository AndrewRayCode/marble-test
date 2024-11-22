'use client';

import { Canvas, useThree, Viewport } from '@react-three/fiber';
import {
  Environment,
  OrbitControls,
  Html,
  TransformControls,
} from '@react-three/drei';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Camera, Mesh, Object3D, Vector2, Vector3 } from 'three';
import { PLAYER_SPEED, SPHERE_RADIUS } from '@/game/constants';
import {
  curveForChoiceTile,
  curveForRailTile,
  QuarterTurn,
  Straightaway,
  Junction,
} from '@/game/curves';
import {
  isRailTile,
  ScreenArrow,
  ScreenArrows,
  Tile,
  useKeyboardControls,
  useStore,
} from '@/store/store';
import { clamp } from 'three/src/math/MathUtils.js';

import styles from './styles.module.css';

const toWorld = (object: Object3D) => {
  const vector = new Vector3();
  object.getWorldPosition(vector);
  return vector;
};

const toScreen = (position: Vector3, camera: Camera, viewport: Viewport) => {
  const vector = position.clone();
  vector.project(camera);
  const x = (vector.x * 0.5 + 0.5) * viewport.width;
  const y = (-vector.y * 0.5 + 0.5) * viewport.height;
  return { x, y };
};

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

const arrowLookup = {
  left: '⭠',
  right: '⭢',
  up: '⭡',
  down: '⭣',
};

const screenLeft = new Vector2(-1, 0);
const screenRight = new Vector2(1, 0);
const screenUp = new Vector2(0, -1);
const screenDown = new Vector2(0, 1);

const useThung = () => {
  const itemsRef = useRef(new Map());

  const setRef = useCallback(
    (key: string | number) => (node: unknown) => {
      if (node) {
        itemsRef.current.set(key, node);
      } else {
        itemsRef.current.delete(key);
      }
    },
    [],
  );

  return [itemsRef.current, setRef] as const;
};

const Game = () => {
  const marbleRef = useRef<Mesh>(null);

  const setCurrentCurve = useStore((state) => state.setCurrentCurve);
  const currentCurve = useStore((state) => state.currentCurve);
  const setCurveProgress = useStore((state) => state.setCurveProgress);
  const setCurrentTile = useStore((state) => state.setCurrentTile);
  const debug = useStore((state) => state.debug);
  const currentTile = useStore((state) => state.currentTile);
  const level = useStore((state) => state.level);
  const setMomentum = useStore((state) => state.setMomentum);
  const setEnteredFrom = useStore((state) => state.setEnteredFrom);
  const setNextConnection = useStore((state) => state.setNextConnection);
  const keysPressed = useStore((state) => state.keysPressed);
  const currentExitRefs = useStore((state) => state.currentExitRefs);
  const [arrowRefs, setArrowRef] = useThung();

  useKeyboardControls();

  const orbit = useRef<typeof OrbitControls>();
  const transform = useRef<typeof TransformControls>();
  const [mode, setMode] = useState('translate');
  // useEffect(() => {
  //   if (transform.current) {
  //     const controls = transform.current;
  //     console.log({ controls }, controls.setMode);
  //     controls.setMode(mode);
  //     const callback = (event) => {
  //       console.log('dreg');
  //       // OrbitControls.current.enabled = !event.value;
  //     };
  //     controls.addEventListener('dragging-changed', callback);
  //     return () => controls.removeEventListener('dragging-changed', callback);
  //   }
  // }, []);

  const { camera, viewport } = useThree();

  const arrowPositions = useMemo(
    () => (currentTile?.type === 't' ? currentExitRefs.map(toWorld) : []),
    [currentExitRefs, currentTile],
  );

  // Start game :(
  useEffect(() => {
    console.log('Starting game');
    if (isRailTile(level[0])) {
      setCurrentCurve(curveForRailTile(level[0]));
    }
  }, [setCurrentCurve, level]);

  useFrame((state, delta) => {
    const {
      enteredFrom,
      curveProgress,
      currentTile,
      playerMomentum,
      nextConnection,
    } = useStore.getState();

    const marbleScreen = toScreen(
      marbleRef.current!.position,
      camera,
      viewport,
    );

    const entranceDistances = arrowPositions.map((position, entrance) => {
      const screen = toScreen(position, camera, viewport);
      // Create vector pointing from marble to entrance
      const v = new Vector2(
        screen.x - marbleScreen.x,
        screen.y - marbleScreen.y,
      );
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

    arrowsForEntrances.forEach((arrow, i) => {
      arrowRefs.get(i)?.position.copy(arrow.position);
      (arrowRefs.get(`${i}_text`) as HTMLDivElement).textContent =
        arrowLookup[arrow.arrow];
    });

    // setScreenArrows(arrowsForEntrances);
    const directions = arrowsForEntrances.reduce(
      (acc, arrow) => {
        acc[arrow.arrow] = arrow;
        return acc;
      },
      {} as Record<string, ScreenArrow>,
    );

    let nextTile: Tile | undefined;
    const isPositive = playerMomentum >= 0;

    // Type safe bail-out for later, like falling out of level
    if (!currentTile) {
      return;
    }

    const progress = clamp(
      curveProgress +
        playerMomentum * delta * (currentTile.type === 't' ? 2.0 : 1.0),
      0,
      1,
    );

    setCurveProgress(progress);

    if (marbleRef.current && currentCurve && currentTile) {
      if (playerMomentum === 0) {
        if (keysPressed.has('ArrowUp')) {
          setMomentum(PLAYER_SPEED);
        } else if (keysPressed.has('ArrowDown')) {
          setMomentum(-PLAYER_SPEED);
        }
      }

      // Get the point along the curve
      const point = currentCurve.getPointAt(progress);

      // Update the sphere's position
      marbleRef.current.position.copy(point);

      let nextIdx: number | null | undefined;
      let nextId: string | null | undefined;
      let nextEntrance: number | null | undefined;

      // We are the end of this curve in our direction of travel
      if ((progress >= 1.0 && isPositive) || (progress <= 0 && !isPositive)) {
        // We have landed on the junction in the middle of the T
        if (currentTile.type == 't') {
          // We are going towards, and have landed on, the center
          if (nextConnection === -1) {
            const isDown = keysPressed.has('ArrowDown') && directions.down;
            const isLeft = keysPressed.has('ArrowLeft') && directions.left;
            const isRight = keysPressed.has('ArrowRight') && directions.right;
            const isUp = keysPressed.has('ArrowUp') && directions.up;

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
              setCurrentCurve(
                // reverseBezierCurve(curveForChoiceTile(currentTile, 0)),
                // Set the path to the leftmost T arm
                curveForChoiceTile(currentTile, nextConnection),
              );
              // Start at the far end of the curve!
              setCurveProgress(1.0);
              // We are at the t junction, we came from the bottom, and no keys
              // were pressed, so stop!
            } else if (enteredFrom === 1 && playerMomentum !== 0) {
              setMomentum(0);
            }
            // We are getting the hell out of here
          } else if (enteredFrom === -1) {
            nextId = currentTile.connections[nextConnection!];
            nextEntrance = currentTile.entrances[nextConnection!];
          }
        } else {
          // We're on a straightaway

          // Positive momentum means we choose this tile's last exit
          nextIdx = isPositive ? 1 : 0;
          nextId = currentTile.connections[nextIdx];
          nextEntrance = currentTile.entrances[nextIdx];
        }

        if (nextId !== undefined || nextEntrance !== undefined) {
          if (nextId === null || nextEntrance == null) {
            console.log('no next!');
            // fall out of level!
            return;
          } else {
            nextTile = level.find((tile) => tile.id === nextId)!;
          }

          if (!nextTile) {
            console.error('bad next tile', { currentTile, level });
            throw new Error('bad next tile');
          }

          setCurrentTile(nextTile);

          // If connecting to a striaght tile
          if (isRailTile(nextTile)) {
            setCurrentCurve(curveForRailTile(nextTile));
            setEnteredFrom(nextEntrance);
            // Go towards other connection
            setNextConnection(nextEntrance === 0 ? 1 : 0);
            // If we entered from direction of travel, go positive. Otherwise go negative
            setMomentum(nextEntrance === 0 ? PLAYER_SPEED : -PLAYER_SPEED);
            setCurveProgress(nextEntrance === 0 ? 0 : 1);
            // If connecting to a T junction
          } else if (nextTile.type === 't') {
            setCurrentCurve(curveForChoiceTile(nextTile, nextEntrance));
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
      {arrowPositions.map((_, i) => (
        <group ref={setArrowRef(i)} key={i}>
          <Html>
            <div className={styles.key} ref={setArrowRef(`${i}_text`)}></div>
          </Html>
        </group>
      ))}
      <color attach="background" args={['white']} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Environment
        files="/envmaps/room.hdr"
        background
        backgroundBlurriness={0.5}
      />
      <mesh ref={marbleRef}>
        <sphereGeometry args={[SPHERE_RADIUS, 256, 256]} />
        <meshStandardMaterial
          metalness={0.4}
          roughness={0.01}
          envMapIntensity={0.5}
          emissive={0x333333}
        />
      </mesh>

      <TransformControls mode="translate" translationSnap={0.5}>
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="hotpink" wireframe />
        </mesh>
      </TransformControls>

      {level.map((tile) => {
        if (tile.type === 'straight') {
          return <Straightaway key={tile.id} tile={tile} />;
        } else if (tile.type === 'quarter') {
          return <QuarterTurn key={tile.id} tile={tile} />;
        } else if (tile.type === 't') {
          return <Junction key={tile.id} tile={tile} />;
        }
      })}
      {debug &&
        level.map((tile) => {
          if (isRailTile(tile)) {
            return (
              <mesh key={tile.id}>
                <Html className="bg-slate-900 p-1" position={tile.position}>
                  {tile.id}
                </Html>
                <tubeGeometry
                  args={[curveForRailTile(tile), 70, 0.01, 50, false]}
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
                    args={[curveForChoiceTile(tile, 0), 70, 0.01, 50, false]}
                  />
                  <meshStandardMaterial color="blue" wireframe />
                </mesh>
                <mesh>
                  <tubeGeometry
                    args={[curveForChoiceTile(tile, 1), 70, 0.01, 50, false]}
                  />
                  <meshStandardMaterial color="blue" wireframe />
                </mesh>
                <mesh>
                  <tubeGeometry
                    args={[curveForChoiceTile(tile, 2), 70, 0.01, 50, false]}
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

export default function ThreeScene() {
  const toggleDebug = useStore((state) => state.toggleDebug);
  const level = useStore((state) => state.level);
  const setCurrentCurve = useStore((state) => state.setCurrentCurve);
  const resetLevel = useStore((state) => state.resetLevel);
  const playerMomentum = useStore((state) => state.playerMomentum);
  // const curveProgress = useStore((state) => state.curveProgress);
  const debug = useStore((state) => state.debug);

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'd') {
        toggleDebug();
      }
      if (event.key === 'r') {
        console.log('Resetting game!');
        resetLevel(level);
        if (isRailTile(level[0])) {
          setCurrentCurve(curveForRailTile(level[0]));
        }
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [toggleDebug, level, setCurrentCurve, resetLevel]);

  return (
    <div className="h-screen w-full bg-gray-900">
      <Canvas camera={{ position: [0, 0, 6] }} className="h-full w-full">
        <Game />
      </Canvas>
      {debug && (
        <div className="absolute bottom-0 right-0 h-16 w-64 z-2 bg-slate-900 shadow-lg rounded-lg p-2 text-sm">
          <div>momentum: {playerMomentum}</div>
          {/* <div>curve progress: {Math.round(curveProgress * 10) / 10}</div> */}
        </div>
      )}
    </div>
  );
}
