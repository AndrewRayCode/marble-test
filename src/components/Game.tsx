'use client';

import { use, useEffect, useMemo, useRef, useState } from 'react';
import useSound from 'use-sound';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CubicBezierCurve3, PointLight, Vector2, Vector3 } from 'three';
import { clamp } from 'three/src/math/MathUtils.js';
import { Camera, Canvas, useThree } from '@react-three/fiber';
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
  GateTile,
  isJunctionTile,
  PLAYER_ID,
  GameState,
  Level,
  Tile,
  DynamicState,
  FriendTile,
} from '@/store/gameStore';
import { randomInt, toScreen } from '@/util/math';
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
import doorOpen from '@/public/door-open.mp3';
import cinderblock from '@/public/cinderblockmove.mp3';
import sliding from '@/public/sliding.mp3';
import arcadeWin from '@/public/arcade-win.mp3';

import cx from 'classnames';
import Toggle from './Tiles/Toggle';
import Straightaway from './Tiles/Straightaway';
import QuarterTurn from './Tiles/QuarterTurn';
import Junction from './Tiles/Junction';
import { Level as DbLevel } from '@prisma/client';
import EditorUI from './Editor/EditorUI';
import Cap from './Tiles/Cap';
import Box from './Tiles/Box';
import Coin from './Tiles/Coin';
import Gate, { GATE_DEPTH } from './Tiles/Gate';
import Sphere from './Tiles/Sphere';
import Group from './Tiles/Group';
import { useBackgroundRender, useKeyPress } from '@/util/react';

import styles from './game.module.css';
import Player from './Tiles/Player';
import Friend from './Tiles/Friend';
import { INTO_CAP } from '@/util/curves';

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
  dbLevels: DbLevel[];
};

const findCollisions = (
  checks: [string, [number, Vector3]][],
  radius: number,
): Record<string, string> => {
  const collisions: Record<string, string> = {};
  if (checks.length < 2) return {};

  for (let i = 0; i < checks.length - 1; i++) {
    for (let j = i + 1; j < checks.length; j++) {
      const one = checks[i];
      const two = checks[j];
      const distanceSquared = one[1][1].distanceToSquared(two[1][1]);

      if (distanceSquared < radius * radius) {
        collisions[one[0]] = two[0];
        collisions[two[0]] = one[0];
      }
    }
  }
  return collisions;
};

/**
 * Given a real world length in world units, convert it to how for along this
 * curve we have to go to reach that distance
 */
const worldDistanceToTilePercent = (tile: Tile, distance: number) => {
  if (tile.type === 'cap') {
    return (1 / INTO_CAP) * distance;
  }
  if (tile.type === 'quarter') {
    return 0.5 * Math.PI * distance;
  }
  if (tile.type === 't') {
    return distance * 2;
  }
  return distance;
};
/**
 * Given a percent along a curve, determine how far in world units it is
 */
const tilePercentToWorldDistance = (tile: Tile, percent: number) => {
  if (tile.type === 'cap') {
    return INTO_CAP * percent;
  }
  if (tile.type === 'quarter') {
    return percent / (0.5 * Math.PI);
  }
  if (tile.type === 't') {
    return percent / 2;
  }
  return percent;
};

const directionTowards = (
  curve: CubicBezierCurve3,
  curvePercent: number,
  self: Vector3,
  target: Vector3,
) => {
  let aTowardsB = 0;
  if (curvePercent >= 0.99) {
    const lowerAPosition = curve.getPointAt(Math.max(curvePercent - 0.01, 0));
    aTowardsB =
      // If lower position is closer, go negative towards B
      lowerAPosition.distanceTo(target) < self.distanceTo(target) ? -1 : 1;
  } else {
    const higherAPosition = curve.getPointAt(Math.min(curvePercent + 0.01, 1));
    aTowardsB =
      // If higher position is closer, go positive towards B
      higherAPosition.distanceTo(target) < self.distanceTo(target) ? 1 : -1;
  }
  return aTowardsB;
};

/**
 * Collision resolution: Given object A is colliding with object B, figure out
 * what percent on the curve to place object A so that it is not colliding with
 * object B
 */
const snapCollision = (
  aPosition: [number, number, number],
  aCurvePercent: number,
  aTile: Tile,
  aCurve: CubicBezierCurve3,
  aRadius: number,
  bPosition: [number, number, number],
  bCurvePercent: number,
  bTile: Tile,
  bCurve: CubicBezierCurve3,
  bRadius: number,
) => {
  const aPosV = new Vector3(...aPosition);
  const bPosV = new Vector3(...bPosition);
  const snapDistance = aRadius + bRadius;

  const bTowardsA = directionTowards(bCurve, bCurvePercent, bPosV, aPosV);

  // If we're on the same tile...
  if (aTile.id === bTile.id) {
    // Then snap to the distance between A and B, in curve space
    const percentToSnapBack = worldDistanceToTilePercent(aTile, snapDistance);
    // This can intentionally be lower than 0 and higher than 1! In that case
    // the snapped position is off the curve, and the consumer needs to move A
    // to the right tile
    const newPercent = bCurvePercent + bTowardsA * percentToSnapBack;
    // Except on cap tiles - you can't go past the dead end!
    return [
      aTile.type === 'cap' ? Math.min(1, newPercent) : newPercent,
      -bTowardsA,
    ];
  }

  // If A and B are on different tiles, we need to get the math done for tile
  // A's curve space

  // If going down in percent is closer to A, aka if bTowardsA is negative, then
  // "towards A" is towards 0% on B's tile, so we simply take how far along B
  // already. Othewrise, it's the other direction, aka the reamining percent on
  // the tile, aka 1 - bCurvePercent
  const bPercentLeftOnThisTileTowardsA =
    bTowardsA < 0 ? bCurvePercent : 1 - bCurvePercent;
  const bCurveSpatial = tilePercentToWorldDistance(
    bTile,
    bPercentLeftOnThisTileTowardsA,
  );

  const remainingSpatialDistanceAlongCurveA = snapDistance - bCurveSpatial;
  const remainingAPercent = worldDistanceToTilePercent(
    aTile,
    remainingSpatialDistanceAlongCurveA,
  );

  const aTowardsB = directionTowards(aCurve, aCurvePercent, aPosV, bPosV);
  // let aTowardsB = 0;
  // if (aCurvePercent >= 0.99) {
  //   const lowerAPosition = aCurve.getPointAt(Math.max(aCurvePercent - 0.01, 0));
  //   aTowardsB =
  //     // If lower position is closer, go negative towards B
  //     lowerAPosition.distanceTo(bPosV) < aPosV.distanceTo(bPosV) ? -1 : 1;
  // } else {
  //   const higherAPosition = aCurve.getPointAt(
  //     Math.min(aCurvePercent + 0.01, 1),
  //   );
  //   aTowardsB =
  //     // If higher position is closer, go positive towards B
  //     higherAPosition.distanceTo(bPosV) < aPosV.distanceTo(bPosV) ? 1 : -1;
  // }

  // There are more edge cases so keeping this for now to uncomment for testing
  // if (hasPaused) {
  // console.log({
  //   aTile: aTile,
  //   bTile: bTile,
  //   snapDistance,
  //   aCurvePercent,
  //   bCurvePercent,
  //   aTowardsB,
  //   bTowardsA,
  //   remainingSpatialDistanceAlongCurveA,
  //   remainingAPercent,
  // });
  // }

  return [
    // This bracn only happens if we stay on the same tile, so clamp for safety
    clamp(
      // Let's say A is traveling from left to right, and it came from 1, and
      // it's going to 0. And B is further right. A towards B is negative,
      // because it's going to zero. So we want to snap to the position of the
      // curve towards B, which is 0, and then add in the remaining A percent.
      aTowardsB < 0 ? remainingAPercent : 1.0 - remainingAPercent,
      0,
      1,
    ),
    aTowardsB,
  ];
};

// TODO: This is used for static gates - merge with above function?
const snapProgress = (
  objectId: string,
  s: GameState,
  momentum: number,
  currentTile: Tile,
  enteredFrom: number,
  collisionPoint: [number, number, number],
  radius: number,
) => {
  const tc = s.tilesComputed[currentTile.id];
  // Figure out where we entered from in case we need to go back there
  const ef =
    // If this is a T junction and we came from the middle, the exited
    // from tile won't have a position, so set it to the middle of the T
    currentTile.type === 't' && enteredFrom === -1
      ? tc?.curves[0].getPointAt(1)
      : // If we are on a cap and came from the end piece, calculate the entrance
        // as the dead end point of the cap
        currentTile.type === 'cap' && enteredFrom === -1
        ? tc?.curves[0].getPointAt(1)
        : tc?.exits?.[enteredFrom];

  let newProgress = 0;

  if (currentTile.type === 't') {
    // Figure out how much along this curve we need to go, and then
    // double it, because junction/cap curves are only half width!
    const progressToSnapTo = (TILE_WIDTH - radius) * 2.0;
    // Then reverse it again, because if we are leaving a T, we are
    // travelling in the negative direction, so the point on the
    // curve we want to bonk at is inverted
    newProgress = clamp(TILE_WIDTH - progressToSnapTo, 0, 1);
  } else if (currentTile.type === 'cap') {
    const progressToSnapTo = (TILE_WIDTH - radius) * (1 / INTO_CAP);
    newProgress = clamp(progressToSnapTo, 0, 1);
    console.log('snapped on cap', {
      newProgress,
      enteredFrom,
      t: currentTile.type,
      objectId,
    });
  } else {
    // Otherwise, take the entrance to the collision point, and go back the
    // collision distance, to determine snap position. Negate it if
    // going negative direction.
    const entranceToCollisionPoint = ef.distanceTo(
      new Vector3(...collisionPoint),
    );
    const snappedDistance = entranceToCollisionPoint - radius;
    newProgress = clamp(
      // The case of TILE_WIDTH - snappedDistance might be wrong, I think it's
      // supposed to be 1.0 - (entranceToCollision - radius) - see the notebook
      // drawing although there's low chance it will be readable tomorrow.
      // retest this later with the marble on the other side, on a str8away
      momentum < 0 ? TILE_WIDTH - snappedDistance : snappedDistance,
      0,
      1,
    );
    console.log('snapped on str8', {
      newProgress,
      enteredFrom,
      t: currentTile.type,
      objectId,
    });
  }

  return [ef, newProgress] as const;
};

/**
 * Figure out the Vector3 position of the entrance we came from on this tile
 */
const getEnteredFrom = (
  s: GameState,
  currentTile: Tile,
  enteredFrom: number,
) => {
  const tc = s.tilesComputed[currentTile.id];
  // If this is a T junction and we came from the middle, the exited
  // from tile won't have a position, so set it to the middle of the T
  return currentTile.type === 't' && enteredFrom === -1
    ? tc?.curves[0].getPointAt(1)
    : // If we are on a cap and came from the end piece, calculate the entrance
      // as the dead end point of the cap
      currentTile.type === 'cap' && enteredFrom === -1
      ? tc?.curves[0].getPointAt(1)
      : tc?.exits?.[enteredFrom];
};

const stepCurveProgress = (
  delta: number,
  level: Level,
  objectId: string,
  s: GameState,
): [number, Vector3] => {
  const { currentCurveIndex, momentum } = s.semiDynamicObjects[objectId];
  const { curveProgress } = s.dynamicObjects[objectId];
  const currentTile = level.tiles.find(
    (t): t is TrackTile =>
      t.id === s.semiDynamicObjects[objectId].currentTileId,
  );

  // Type safe bail-out for later, like falling out of level
  if (!currentTile) {
    return [curveProgress, new Vector3()];
  }

  const currentCurve =
    s.tilesComputed[currentTile.id]?.curves?.[currentCurveIndex];

  const propsoedProgress = clamp(
    curveProgress +
      momentum *
        delta *
        (currentTile.type === 'cap'
          ? 4.0
          : currentTile.type === 't'
            ? 2.0
            : 1.0),
    0,
    1,
  );
  return [propsoedProgress, currentCurve.getPointAt(propsoedProgress)];
};

const processObjectCollision = (
  s: GameState,
  level: Level,
  objectId: string,
  proposedProgress: number,
  collisionId: string,
  proposedOtherProgress: number,
  snappedCollisions: Set<string>,
  collisionTileOverflows: Record<string, number>,
  playSfx: Record<string, () => void>,
) => {
  const currentTileId = s.semiDynamicObjects[objectId].currentTileId;

  const currentTile = level.tiles.find(
    (t): t is TrackTile => t.id === currentTileId,
  );

  const { currentCurveIndex, enteredFrom, nextConnection, momentum } =
    s.semiDynamicObjects[objectId];
  const OBJECT_SPEED =
    objectId === PLAYER_ID
      ? PLAYER_SPEED
      : parseFloat(
          level.tiles.find((t): t is FriendTile => t.id === objectId)?.speed ||
            '0',
        );
  // let isPositive = momentum >= 0;

  // Type safe bail-out for later, like falling out of level
  if (!currentTile) {
    return;
  }

  const currentCurve =
    s.tilesComputed[currentTile.id]?.curves?.[currentCurveIndex];

  // If the player collides with a friend, we want to get rules like "do we
  // bounce off or stop" from the friend. If we *are* a friend and we hit
  // another friend, we want to use our *own* rules.
  const selfFriendOrOtherFriend = level.tiles.find(
    (t): t is FriendTile =>
      t.id === (objectId === PLAYER_ID ? collisionId : objectId),
  );
  if (selfFriendOrOtherFriend) {
    const otherPos = s.dynamicObjects[collisionId].position;

    const otherSemiDynamic = s.semiDynamicObjects[collisionId];
    // const otherDynamic = s.dynamicObjects[collisionId];
    const otherTile = level.tiles.find(
      (t) => t.id === otherSemiDynamic.currentTileId,
    );

    const point = currentCurve.getPointAt(proposedProgress);

    // This function does the heavy lifting of determing where on the curve
    // to snap us ot after a collision, and also what direction along the
    // curve the colliding object is at
    const [newProgress, directionToFriend] = snapCollision(
      // Current object
      point.toArray(),
      proposedProgress,
      currentTile,
      currentCurve,
      SPHERE_RADIUS,
      // Other object
      otherPos,
      proposedOtherProgress,
      otherTile!,
      s.tilesComputed[otherSemiDynamic.currentTileId!]?.curves[
        otherSemiDynamic.currentCurveIndex
      ],
      SPHERE_RADIUS,
    );
    if (s.isPaused) {
      console.log('result of snepPep() from', { proposedProgress }, 'to', {
        newProgress,
      });
    }

    if (momentum !== 0 && !snappedCollisions.has(objectId)) {
      console.log('snapping to collision', objectId);
      // Collision possible result: We snapped to a curve percent on the same
      // tile, aka we did not get bumped to a new tile.
      if (newProgress >= 0 && newProgress <= 1) {
        s.setMomentum(objectId, 0);
        s.setPosition(objectId, point.toArray());

        s.setCurveProgress(objectId, newProgress);

        // Collision possible result: If the progress on this curve we got
        // snapped to is out of bounds for this curve, calculate some
        // information to pass on later in the loop for resolving the tile
      } else {
        s.setCurveProgress(objectId, newProgress);
        s.setMomentum(objectId, newProgress > 1 ? -OBJECT_SPEED : OBJECT_SPEED);
        // Next progress is the amount into the next tile to go - BUT we
        // don't know the next tile yet! Setting nextDistance is handled by
        // the tile transition code later in the loop
        collisionTileOverflows[objectId] = tilePercentToWorldDistance(
          currentTile,
          newProgress < 0 ? Math.abs(newProgress) : newProgress - 1,
        );
        // Force a direction to trigger the next tile if() check later
        // will this automaticlaly work with the game step loop?
        // isPositive = newProgress > 1;
      }
    }

    playSfx['metalHit']();
    playSfx['metalHit2']();

    // If we should stop and we are moving
    if (selfFriendOrOtherFriend.hitBehavior === 'stop' && momentum !== 0) {
      s.setMomentum(objectId, 0);
      // Only player has directional arrows
      if (objectId === PLAYER_ID) {
        const ef = getEnteredFrom(s, currentTile, enteredFrom);
        // Edge case: at the start of the game, there is no tile entrance
        // we came from!
        if (ef) {
          s.setBonkBackTo({
            nextDirection: momentum < 0 ? 1 : -1,
            lastExit: ef.toArray(),
          });
        } else {
          // We were bonked while we were stopped. I think this is an no-op,
          // but TODO: resetting directional arrows later, also this does
          // not account for the case where we were bonked to stop, but are
          // holding an arrow to keep moving
        }
      }
    } else if (
      selfFriendOrOtherFriend.hitBehavior === 'bounce' &&
      // Edge case: If we're at the end of a dead end tile, there's nowhere
      // to bounce to!
      (currentTile.type !== 'cap' || proposedProgress !== 1)
    ) {
      s.setMomentum(
        objectId,
        // Bounce away from friend, regardless of current direction
        directionToFriend > 0 ? -OBJECT_SPEED : OBJECT_SPEED,
      );
      s.setEnteredFrom(objectId, nextConnection!);
      s.setNextConnection(objectId, enteredFrom);
    }
  }

  snappedCollisions.add(collisionId);
};

/**
 * Step the game simulation for this object for one frame
 */
const stepGameObject = (
  delta: number,
  level: Level,
  objectId: string,
  keys: Record<string, boolean>,
  camera: Camera,
  arrowPositions: Record<string, Vector3[]>,
  s: GameState,
  collisionTileOverflows: Record<string, number>,
  playSfx: Record<string, () => void>,
) => {
  const currentTileId = s.semiDynamicObjects[objectId].currentTileId;
  if (!currentTileId) {
    return;
  }
  const currentTile = level.tiles.find(
    (t): t is TrackTile => t.id === currentTileId,
  );
  const currentObject = level.tiles.find((t) => t.id === objectId);
  const currentTilePosition = s.tilesComputed[currentTileId]?.position;

  const tileScreen = toScreen(currentTilePosition, camera, {
    // r3f viewport size is busted - reports much smaller numbers
    width: window.innerWidth,
    height: window.innerHeight,
  });
  // let debug = document.getElementById(`debugtile`);
  // if (!debug) {
  //   debug = document.createElement('div');
  //   debug.id = `debugtile`;
  //   debug.style.position = 'absolute';
  //   debug.style.width = '10px';
  //   debug.style.height = '10px';
  //   debug.style.background = 'black';
  //   debug.style.zIndex = '1000';
  //   document.body.appendChild(debug);
  // }
  // debug.style.left = `${tileScreen.x}px`;
  // debug.style.top = `${tileScreen.y}px`;

  const entranceDistances = arrowPositions[objectId].map(
    (position, entrance) => {
      // const viewport = getCurrentViewport();
      const screen = toScreen(position, camera, {
        width: window.innerWidth,
        height: window.innerHeight,
      });
      // Create vector pointing from marble to entrance
      const v = new Vector2(screen.x - tileScreen.x, screen.y - tileScreen.y);
      // let debug = document.getElementById(`debug${entrance}`);
      // if (!debug) {
      //   debug = document.createElement('div');
      //   debug.id = `debug${entrance}`;
      //   debug.style.position = 'absolute';
      //   debug.style.width = '7px';
      //   debug.style.height = '7px';
      //   debug.style.background = ['red', 'green', 'blue'][entrance];
      //   debug.style.zIndex = '1000';
      //   document.body.appendChild(debug);
      // }
      // debug.style.left = `${screen.x}px`;
      // debug.style.top = `${screen.y}px`;
      return {
        entrance,
        position,
        left: screenLeft.angleTo(v),
        right: screenRight.angleTo(v),
        up: screenUp.angleTo(v),
        down: screenDown.angleTo(v),
      };
    },
  );

  const seen = new Set<string>();
  const arrowsForEntrances = entranceDistances.reduce((acc, d, i) => {
    // Figure out which cardinal direction this is most pointing
    const arrow = lowest(d);
    // Only one entrance per cardinal direction!
    if (!seen.has(arrow)) {
      seen.add(arrow);
      return acc.concat({
        position: d.position,
        entrance: d.entrance,
        arrow: lowest(d),
      });
    }
    return acc;
  }, [] as ScreenArrows);

  if (objectId === PLAYER_ID) {
    s.setScreenArrows(arrowsForEntrances);
  }

  const directions = arrowsForEntrances.reduce(
    (acc, arrow) => {
      acc[arrow.arrow] = arrow;
      return acc;
    },
    {} as Record<string, ScreenArrow>,
  );

  const { currentCurveIndex, enteredFrom, nextConnection, momentum } =
    s.semiDynamicObjects[objectId];
  const OBJECT_SPEED =
    objectId === PLAYER_ID
      ? PLAYER_SPEED
      : parseFloat((currentObject as FriendTile)?.speed || '0');
  const { curveProgress, position } = s.dynamicObjects[objectId];

  let progress = curveProgress;
  let point = new Vector3(...position);
  const isPositive = momentum >= 0;

  // Type safe bail-out for later, like falling out of level
  if (!currentTile) {
    return;
  }

  const currentCurve =
    s.tilesComputed[currentTile.id]?.curves?.[currentCurveIndex];

  // let progress = clamp(
  //   curveProgress +
  //     momentum *
  //       delta *
  //       (currentTile.type === 'cap'
  //         ? 4.0
  //         : currentTile.type === 't'
  //           ? 2.0
  //           : 1.0),
  //   0,
  //   1,
  // );

  // s.setCurveProgress(objectId, progress);

  if (currentCurve && currentTile) {
    // Get the point along the curve
    // let point = currentCurve.getPointAt(progress);
    // s.setPosition(objectId, point.toArray());

    level.tiles
      .filter((t) => t.type === 'coin' && !s.collectedItems.has(t.id))
      .forEach((coin) => {
        const isNear =
          point.distanceTo(new Vector3(...coin.position)) <
          INITIAL_SPHERE_RADIUS;
        if (isNear) {
          playSfx['coin']();
          playSfx['money']();
          s.collectItem(coin.id);
        }
      });

    // Check for gate collision
    const gateCollisionDistance = SPHERE_RADIUS + GATE_DEPTH / 2;
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
        const [ef, newProgress] = snapProgress(
          'x',
          s,
          momentum,
          currentTile,
          enteredFrom,
          gate.position,
          gateCollisionDistance,
        );

        if (momentum !== 0) {
          playSfx['error']();
        }

        const newPoint = currentCurve.getPointAt(newProgress);
        s.setMomentum(objectId, 0);
        s.setBonkBackTo({
          nextDirection: momentum < 0 ? 1 : -1,
          lastExit: ef.toArray(),
        });
        point = newPoint;
        s.setPosition(objectId, point.toArray());
        progress = newProgress;
        s.setCurveProgress(objectId, newProgress);
      });

    // Check for switch presses
    level.tiles
      .filter((t): t is ButtonTile => t.type === 'button')
      .forEach((button) => {
        const isNear = point.distanceTo(new Vector3(...button.position)) < 0.5;
        const on = s.booleanSwitches[button.id];
        const enabled =
          s.enabledBooleanSwitchesFor[objectId]?.[button.id] !== false;
        const { actions } = button;

        // Rolling over action triggers each time, and rolling away resets
        // the button itself (independent of the action)
        if (button.actionType === 'click') {
          if (enabled && isNear) {
            playSfx['btn']();
            s.setEnabledBooleanSwitchesFor(objectId, button.id, false);

            actions.forEach((action) => {
              if (action.type === 'gate') {
                playSfx['gadget2']();
              } else if (action.type == 'rotation') {
                playSfx['gadget1']();
              } else if (action.type === 'translation') {
                playSfx['sliding']();
              }
              s.applyAction(currentTile, action);
            });
          } else if (!enabled && !isNear) {
            s.setEnabledBooleanSwitchesFor(objectId, button.id, true);
          }
          // Roling over the button triggers the action each time, and the button
          // state stays in this state until hit again, independent of the action
        } else if (button.actionType === 'toggle') {
          if (enabled && isNear) {
            playSfx['btn']();
            s.setEnabledBooleanSwitchesFor(objectId, button.id, false);
            s.setBooleanSwitch(button.id, !on);

            if (!on) {
              actions.forEach((action) => {
                if (action.type === 'gate') {
                  playSfx['gadget2']();
                } else if (action.type == 'rotation') {
                  playSfx['gadget1']();
                }
                s.applyAction(currentTile, action);
              });
            } else {
              actions.forEach((action) => {
                if (action.type === 'gate') {
                  playSfx['gadget2']();
                } else if (action.type == 'rotation') {
                  playSfx['gadget1']();
                } else if (action.type === 'translation') {
                  playSfx['sliding']();
                }
                s.clearAction(currentTile, action);
              });
            }
          } else if (!enabled && !isNear) {
            s.setEnabledBooleanSwitchesFor(objectId, button.id, true);
          }
          // Need to stay over
        } else if (button.actionType === 'hold') {
          if (enabled && isNear) {
            playSfx['btn']();
            s.setEnabledBooleanSwitchesFor(objectId, button.id, false);
            s.setBooleanSwitch(button.id, !on);
            actions.forEach((action) => {
              if (action.type === 'gate') {
                playSfx['gadget2']();
              } else if (action.type == 'rotation') {
                playSfx['gadget1']();
              } else if (action.type === 'translation') {
                playSfx['sliding']();
              }
              s.applyAction(currentTile, action);
            });
          }
          if (!enabled && !isNear) {
            playSfx['btn']();
            s.setEnabledBooleanSwitchesFor(objectId, button.id, true);
            s.setBooleanSwitch(button.id, !on);

            actions.forEach((action) => {
              if (action.type === 'gate') {
                playSfx['gadget2']();
              } else if (action.type == 'rotation') {
                playSfx['gadget1']();
              } else if (action.type === 'translation') {
                playSfx['sliding']();
              }
              s.clearAction(currentTile, action);
            });
          }
        }
      });

    const isDown =
      objectId === PLAYER_ID && keys.down && directions.down && !s.victory;
    const isLeft =
      objectId === PLAYER_ID && keys.left && directions.left && !s.victory;
    const isRight =
      objectId === PLAYER_ID && keys.right && directions.right && !s.victory;
    const isUp =
      objectId === PLAYER_ID && keys.up && directions.up && !s.victory;
    const isValidUserChoosenDirection = isDown || isLeft || isRight || isUp;

    if (s.bonkBackTo && isValidUserChoosenDirection) {
      s.setMomentum(objectId, s.bonkBackTo.nextDirection * OBJECT_SPEED);
      s.clearBonkBackTo();
    }

    // If we're on a tile and stopped - like if the game starts on a straight
    // away, let the user move out of it. Buuuut how do we choose the movement
    // direction?
    if (!s.bonkBackTo && momentum === 0 && isValidUserChoosenDirection) {
      s.setMomentum(objectId, isUp || isLeft ? OBJECT_SPEED : -OBJECT_SPEED);
    }

    let nextTile: TrackTile | undefined;
    let nextIdx: number | null | undefined;
    let nextId: string | null | undefined;
    let nextEntrance: number | null | undefined;
    let nextDistance: number | undefined;

    /**
     * Tile transition check. If this statement is true, we are the end of this
     * curve in our direction of travel, and need to figure out what tile to
     * move to.
     */
    if ((progress >= 1.0 && isPositive) || (progress <= 0 && !isPositive)) {
      // We have landed on the junction in the middle of the T
      if (currentTile.type === 'cap') {
        // We are leaving
        if (nextConnection === 0) {
          nextId = currentTile.connections[0];
          nextEntrance = currentTile.entrances[0];
          // Progress is 100% and we went the right way to get out, so get out
        } else if (isValidUserChoosenDirection) {
          s.setEnteredFrom(objectId, -1);
          s.setNextConnection(objectId, 0);
          s.setMomentum(objectId, -OBJECT_SPEED);
          s.setCurveProgress(objectId, 1.0);
        } else if (currentObject?.type === 'friend') {
          if (currentObject.deadEndBehavior === 'stop' && momentum !== 0) {
            if (momentum !== 0) {
              s.setMomentum(objectId, 0);
              playSfx['metalHit']();
              playSfx['metalHit2']();
            }
          } else if (currentObject.deadEndBehavior === 'bounce') {
            s.setEnteredFrom(objectId, -1);
            s.setNextConnection(objectId, 0);
            s.setMomentum(objectId, -OBJECT_SPEED);
            s.setCurveProgress(objectId, 1.0);
            playSfx['metalHit']();
            playSfx['metalHit2']();
          }
          // We hit the center of the cap
        } else if (momentum !== 0) {
          s.setMomentum(objectId, 0);
          playSfx['metalHit']();
          playSfx['metalHit2']();
        }
      } else if (currentTile.type == 't') {
        // We are going towards, and have landed on, the center
        if (nextConnection === -1) {
          if (objectId === PLAYER_ID) {
            let userChoiceConnection: number | undefined;
            if (isValidUserChoosenDirection) {
              userChoiceConnection = isDown
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
            //   userChoiceConnection = autoLeft ? 0 : 1;
            // }

            if (userChoiceConnection !== undefined) {
              // Start from the T junction
              s.setEnteredFrom(objectId, -1);

              s.setNextConnection(objectId, userChoiceConnection);
              // We are moving out from T so negative momentum
              s.setMomentum(objectId, -OBJECT_SPEED);
              s.setCurrentCurveIndex(objectId, userChoiceConnection);
              // Start at the far end of the curve!
              s.setCurveProgress(objectId, 1.0);
              // We are at the t junction, we came from the bottom, and no keys
              // were pressed, so stop!
            } else if (momentum !== 0) {
              if (enteredFrom === 1) {
                playSfx['metalHit']();
                playSfx['metalHit2']();
              }
              s.setMomentum(objectId, 0);
            }
          } else if (currentObject?.type === 'friend') {
            // We hit the T from the bottom, play a sound
            if (enteredFrom === 1 && momentum !== 0) {
              playSfx['metalHit']();
              playSfx['metalHit2']();
            }
            const db = currentObject.directionBehavior;
            // If we should stop and we started from the end of the T, stop
            if (db === 'stop' && enteredFrom === 1) {
              s.setMomentum(objectId, 0);
              // Otherwise se keep going
            } else {
              // Start from the T junction
              s.setEnteredFrom(objectId, -1);

              const nextConnection =
                db === 'left' ? 0 : db === 'right' ? 1 : randomInt(0, 2);
              s.setNextConnection(objectId, nextConnection);
              // We are moving out from T so negative momentum
              s.setMomentum(objectId, -OBJECT_SPEED);
              s.setCurrentCurveIndex(objectId, nextConnection);
              // Start at the far end of the curve!
              s.setCurveProgress(objectId, 1.0);
            }
          }
          // We are getting the hell out of here
        } else if (enteredFrom === -1) {
          nextId = currentTile.connections[nextConnection!];
          nextEntrance = currentTile.entrances[nextConnection!];

          if (!nextId || nextEntrance === undefined) {
            playSfx['springboard']();
            s.setMomentum(
              objectId,
              momentum > 0 ? -OBJECT_SPEED : OBJECT_SPEED,
            );
            s.setEnteredFrom(objectId, nextConnection!);
            s.setNextConnection(objectId, -1);
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
          playSfx['springboard']();
          s.setMomentum(objectId, momentum > 0 ? -OBJECT_SPEED : OBJECT_SPEED);
          s.setEnteredFrom(objectId, nextConnection!);
          s.setNextConnection(objectId, nextConnection === 0 ? 1 : 0);
        }
      }

      // If we detected there is somewhere to go...
      if (nextId !== undefined || nextEntrance !== undefined) {
        if (objectId === PLAYER_ID) {
          console.log('transition to', {
            nextId,
            progress,
            isPositive,
            momentum,
            curveProgress,
          });
        }
        if (nextId === null || nextEntrance == null) {
          throw new Error('wtf?');
        } else {
          nextTile = level.tiles.find(
            (tile): tile is TrackTile => tile.id === nextId,
          )!;
        }

        if (!nextTile) {
          console.error('bad next tile', { currentTile, level });
          throw new Error('bad next tile');
        }

        s.setCurrentTileId(objectId, nextTile.id);

        // ...
        const nextDistance = collisionTileOverflows[objectId];

        // If connecting to a striaght tile
        if (isRailTile(nextTile)) {
          s.setCurrentCurveIndex(objectId, 0);
          s.setEnteredFrom(objectId, nextEntrance);
          // Go towards other connection
          s.setNextConnection(objectId, nextEntrance === 0 ? 1 : 0);
          // If we entered from direction of travel, go positive. Otherwise go negative
          s.setMomentum(
            objectId,
            nextEntrance === 0 ? OBJECT_SPEED : -OBJECT_SPEED,
          );
          let nextProgress = nextEntrance === 0 ? 0 : 1;
          if (nextDistance !== undefined) {
            const tilePercent = worldDistanceToTilePercent(
              nextTile,
              nextDistance,
            );
            nextProgress = nextEntrance === 0 ? tilePercent : 1 - tilePercent;
          }
          if (s.isPaused && objectId === PLAYER_ID) {
            console.log('moving to next curve', {
              nextProgress,
              nextEntrance,
              nextDistance,
            });
          }
          s.setCurveProgress(objectId, nextProgress);
          // If connecting to a T junction
        } else if (nextTile.type === 't') {
          s.setCurrentCurveIndex(objectId, nextEntrance);
          s.setEnteredFrom(objectId, nextEntrance);
          // We are entering a choice tile - the next connection is t center
          s.setNextConnection(objectId, -1);
          // All T junction tile curves point inward so go positive
          s.setMomentum(objectId, OBJECT_SPEED);

          let nextProgress = 0;
          // This might be wrong pushing through middle of T?
          if (nextDistance !== undefined) {
            nextProgress = worldDistanceToTilePercent(nextTile, nextDistance);
          }
          if (s.isPaused && objectId === PLAYER_ID) {
            console.log('moving to next curve', {
              nextProgress,
              nextEntrance,
              nextDistance,
            });
          }
          s.setCurveProgress(objectId, nextProgress);
        }
      }
    }
  }
};

const Game = () => {
  const [, key] = useKeyboardControls();

  const buddies = useGameStore((state) => state.buddies);
  const debugPoints = useGameStore((state) => state.debugPoints);
  const toggleDebug = useGameStore((state) => state.toggleDebug);
  const resetLevel = useGameStore((state) => state.resetLevel);
  const levels = useGameStore((state) => state.levels);
  const debug = useGameStore((state) => state.debug);
  const currentTileId = useGameStore(
    (state) => state.semiDynamicObjects[PLAYER_ID].currentTileId,
  );
  const currentLevelId = useGameStore((state) => state.currentLevelId);

  const gameStarted = useGameStore((state) => state.gameStarted);
  const setGameStarted = useGameStore((state) => state.setGameStarted);
  const isEditing = useGameStore((state) => state.isEditing);
  const setIsEditing = useGameStore((state) => state.setIsEditing);
  const tilesComputed = useGameStore((state) => state.tilesComputed);
  const collectedItems = useGameStore((state) => state.collectedItems);
  const bonkBackTo = useGameStore((state) => state.bonkBackTo);
  const setVictory = useGameStore((state) => state.setVictory);
  const semiDynamicObjects = useGameStore((state) => state.semiDynamicObjects);

  const [gameObjectsRef, renderBackground] = useBackgroundRender();

  // const { getCurrentViewport } = useThree((state) => state.viewport);

  const pointLight = useRef<PointLight | null>(null);
  const orbit = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

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

  const arrowPositions = useMemo(
    () =>
      Object.entries(semiDynamicObjects).reduce<Record<string, Vector3[]>>(
        (acc, [objectId, { currentTileId }]) => {
          const currentTile = level?.tiles.find((t) => t.id === currentTileId);
          return {
            ...acc,
            [objectId]: !currentTile
              ? []
              : bonkBackTo
                ? [new Vector3(...bonkBackTo.lastExit)]
                : currentTile?.type === 't'
                  ? tilesComputed[currentTile.id].exits
                  : currentTile?.type === 'cap'
                    ? [tilesComputed[currentTile.id]?.curves[0].getPointAt(0)]
                    : [
                        tilesComputed[currentTile.id]?.curves[0].getPointAt(0),
                        tilesComputed[currentTile.id]?.curves[0].getPointAt(1),
                      ],
          };
        },
        {},
      ),
    [tilesComputed, bonkBackTo, semiDynamicObjects, level],
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
  // const [playMetalHitSfx] = useSound(metalSfx, { volume: 0.01 });
  // const [playMetalHit2Sfx] = useSound(metal2Sfx, { volume: 0.0 });
  const [playMetalHitSfx] = useSound(metalSfx, { volume: 0.0 });
  const [playMetalHit2Sfx] = useSound(metal2Sfx, { volume: 0.0 });
  // const [playSpringboardSfx] = useSound(springboardSfx, { volume: 1 });
  const [playSpringboardSfx] = useSound(springboardSfx, { volume: 0 });
  const [playGadget1Sfx] = useSound(gadget1Sfx, { volume: 0.25 });
  const [playGadget2Sfx] = useSound(gadget2Sfx, { volume: 0.25 });
  const [playDoorOpenSfx] = useSound(doorOpen, {
    volume: 0.25,
    playbackRate: 1.75,
  });
  const [playCinderblockSfx] = useSound(cinderblock, {
    volume: 0.1,
    playbackRate: 1.75,
  });
  const [playSlidingSfx] = useSound(sliding, {
    volume: 0.5,
    playbackRate: 1.75,
  });
  const [playArcadeWinSfx] = useSound(arcadeWin, {
    volume: 0.9,
  });

  const sfx = useMemo(
    () => ({
      btn: playBtnSfx,
      coin: playCoinSfx,
      money: playMoneySfx,
      error: playErrorSfx,
      success: playSuccessSfx,
      metalHit: playMetalHitSfx,
      metalHit2: playMetalHit2Sfx,
      springboard: playSpringboardSfx,
      gadget1: playGadget1Sfx,
      gadget2: playGadget2Sfx,
      doorOpen: playDoorOpenSfx,
      cinderblock: playCinderblockSfx,
      sliding: playSlidingSfx,
      arcadeWin: playArcadeWinSfx,
    }),
    [
      playBtnSfx,
      playCoinSfx,
      playMoneySfx,
      playErrorSfx,
      playSuccessSfx,
      playMetalHitSfx,
      playMetalHit2Sfx,
      playSpringboardSfx,
      playGadget1Sfx,
      playGadget2Sfx,
      playDoorOpenSfx,
      playCinderblockSfx,
      playSlidingSfx,
      playArcadeWinSfx,
    ],
  );

  const currentTilePosition = useMemo(() => {
    if (currentTileId) {
      return tilesComputed[currentTileId]?.position;
    }
  }, [currentTileId, tilesComputed]);

  // Start game :(
  useEffect(() => {
    if (!gameStarted) {
      setGameStarted(true);
      console.log('Starting game');
      resetLevel();
    }
  }, [gameStarted, setGameStarted, resetLevel]);

  useFrame((state, delta) => {
    renderBackground();
    const st = useGameStore.getState();
    if (key().p) {
      st.setIsPaused(!st.isPaused);
      return;
    }
    if (st.isPaused) {
      if (!key().s) {
        return;
      }
      delta = 0.01;
    }

    const s = useGameStore.getState();

    if (!level || !currentTile) {
      return;
    }

    const friends = level.tiles.filter((t) => t.type === 'friend');

    // Propose all of the new positions, but don't do anything with them yet
    const proposedCurveProgresses = friends.reduce<
      Record<string, [number, Vector3]>
    >(
      (acc, friend) => {
        acc[friend.id] = stepCurveProgress(delta, level, friend.id, s);
        return acc;
      },
      {
        [PLAYER_ID]: stepCurveProgress(delta, level, PLAYER_ID, s),
      },
    );

    const propositions = Object.entries(proposedCurveProgresses);

    const collisionTileOverflows: Record<string, number> = {};
    const processedCollisions = new Set<string>();

    // Then check for collisions in the new proposed positions
    const collisions = findCollisions(propositions, SPHERE_RADIUS * 2);

    propositions.forEach(([objectId, [proposedProgress, proposedPosition]]) => {
      // If there was a collision, snap the objects away from each other. This
      // function updates the curve progress and position
      if (collisions[objectId]) {
        processObjectCollision(
          s,
          level,
          objectId,
          proposedProgress,
          collisions[objectId],
          proposedCurveProgresses[objectId][0],
          processedCollisions,
          collisionTileOverflows,
          sfx,
        );
        // If there was no collision we are safe to commit the position
      } else {
        s.setCurveProgress(objectId, proposedProgress);
        s.setPosition(objectId, proposedPosition.toArray());
      }
    });

    // Refresh game store to get latest state updates (is this neccessary?)
    const newS = useGameStore.getState();

    // Then step the game objects with the new committed positions
    stepGameObject(
      delta,
      level,
      PLAYER_ID,
      key(),
      camera,
      arrowPositions,
      newS,
      collisionTileOverflows,
      sfx,
    );
    if (!isEditing) {
      friends.forEach((tile) => {
        stepGameObject(
          delta,
          level,
          tile.id,
          key(),
          camera,
          arrowPositions,
          newS,
          collisionTileOverflows,
          sfx,
        );
      });
    }

    const coins = level.tiles.filter((t) => t.type === 'coin');
    if (
      coins.length &&
      coins.filter((t) => !newS.collectedItems.has(t.id)).length === 0 &&
      !newS.victory
    ) {
      // playSuccessSfx();
      playArcadeWinSfx();
      setVictory(true);
    }
  });

  return (
    <>
      <color attach="background" args={['white']} />
      <ambientLight intensity={0.1} />
      <pointLight
        position={[0, 8, 0]}
        intensity={5}
        castShadow
        ref={pointLight}
      />
      <Environment
        files="/envmaps/room.hdr"
        background
        backgroundBlurriness={0.3}
      />

      <group ref={gameObjectsRef}>
        <Player />

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
                  <meshStandardMaterial
                    color="blue"
                    transparent
                    opacity={0.5}
                  />
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
              } else if (tile.type === 'friend') {
                return <Friend key={tile.id} tile={tile} />;
              }
            })}

        {isEditing && (
          <EditorComponent
            setOrbitEnabled={(e) =>
              orbit.current && (orbit.current.enabled = e)
            }
          />
        )}

        {debug &&
          level &&
          level.tiles.map((tile) => {
            return (
              <group key={tile.id}>
                {tile.type !== 'box' && tile.type !== 'sphere' && (
                  <Html
                    className={cx('bg-slate-900 idOverlay')}
                    position={tilesComputed[tile.id]?.position}
                  >
                    {tile.id}
                  </Html>
                )}
                {isRailTile(tile) ? (
                  <Html
                    className={cx('bg-sky-900 idOverlay')}
                    position={tilesComputed[tile.id]?.curves?.[0].getPointAt(
                      0.05,
                    )}
                  >
                    0
                  </Html>
                ) : null}
                {isRailTile(tile) ? (
                  <Html
                    className={cx('bg-sky-900 idOverlay')}
                    position={tilesComputed[tile.id]?.curves?.[0].getPointAt(
                      0.95,
                    )}
                  >
                    1
                  </Html>
                ) : null}
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
                    <meshStandardMaterial color="red" wireframe />
                  </mesh>
                ) : isJunctionTile(tile) ? (
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
                      <meshStandardMaterial color="red" wireframe />
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
                      <meshStandardMaterial color="red" wireframe />
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
                      <meshStandardMaterial color="red" wireframe />
                    </mesh>
                  </group>
                ) : null}
              </group>
            );
          })}

        {debug && currentTilePosition && (
          <mesh position={currentTilePosition}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="red" opacity={0.5} transparent />
          </mesh>
        )}
        <OrbitControls ref={orbit} />
      </group>
    </>
  );
};

export default function ThreeScene({ dbLevels }: GameProps) {
  // const curveProgress = useStore((state) => state.curveProgress);
  const isEditing = useGameStore((state) => state.isEditing);
  const levels = useGameStore((state) => state.levels);
  const currentLevelId = useGameStore((state) => state.currentLevelId);
  const setaCurrentLevelId = useGameStore((state) => state.setCurrentLevelId);
  const setLevelsFromDb = useGameStore((state) => state.setLevelsFromDb);
  const setInputFocused = useGameStore((state) => state.setIsInputFocused);
  const victory = useGameStore((state) => state.victory);
  const setVictory = useGameStore((state) => state.setVictory);
  const setCurrentLevelId = useGameStore((state) => state.setCurrentLevelId);
  const resetLevel = useGameStore((state) => state.resetLevel);

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
          { name: 'p', keys: ['p'] },
          { name: 's', keys: ['s'] },
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
          {!isEditing && victory && (
            <div className="absolute inset-0 bg-gray-900 bg-opacity-25 flex items-center justify-center z-20">
              <div className="bg-slate-900 p-6 rounded-xl drop-shadow-[0_0_25px_5px_rgba(0,0,0,1)] text-center">
                <h1 className="text-4xl font-bold mb-4">Victory!</h1>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <button
                      className={styles.button}
                      onClick={() => {
                        const idx = levels.findIndex(
                          (l) => l.id === currentLevelId,
                        );
                        const nextIndex = (idx + 1) % levels.length;
                        setVictory(false);
                        setCurrentLevelId(levels[nextIndex].id!);
                      }}
                    >
                      Next level
                    </button>
                  </div>
                  <div>
                    <button
                      className={styles.button}
                      onClick={() => {
                        setVictory(false);
                        resetLevel();
                      }}
                    >
                      Replay
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <Canvas
            shadows
            orthographic
            camera={{ zoom: 50, position: [0, 0, 100] }}
            // camera={{ position: [0, 0, 5] }}
            className="h-full w-full"
          >
            <Game />
          </Canvas>
        </EditorUI>
      </KeyboardControls>
    </div>
  );
}
