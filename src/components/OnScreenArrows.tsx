'use client';

import { Html } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import cx from 'classnames';

import { TrackTile, useGameStore } from '@/store/gameStore';
import { useRefMap } from '@/util/react';

import styles from './styles.module.css';
import { Group, Vector3 } from 'three';

const arrowLookup = {
  left: '⭠',
  right: '⭢',
  up: '⭡',
  down: '⭣',
};

/**
 * Show directional arrows at a junction on screen. These need to update every
 * frame as the camera moves, because arrow directions and visbilities are
 * dependent on their relative screen position
 */
const OnScreenArrows = () => {
  const level = useGameStore((state) =>
    state.levels.find((l) => l.id === state.currentLevelId),
  );
  const currentTileId = useGameStore((state) => state.currentTileId);
  const tilesComputed = useGameStore((state) => state.tilesComputed);
  const [arrowRefs, setArrowRef] = useRefMap<Group>();
  const [htmlRefs, setHtmlRefs] = useRefMap<HTMLDivElement>();
  const bonkBackTo = useGameStore((state) => state.bonkBackTo);

  const currentTile = useMemo(() => {
    if (currentTileId && level) {
      return level.tiles.find((t): t is TrackTile => t.id === currentTileId);
    }
  }, [currentTileId, level]);

  // For every exit position of this junction, there is a *potential* arrow
  // to show
  const arrowPositions = useMemo(
    () =>
      !currentTile
        ? []
        : currentTile?.type === 't'
          ? tilesComputed[currentTile.id].exits
          : currentTile?.type === 'cap'
            ? [tilesComputed[currentTile.id]?.curves[0].getPointAt(0)]
            : bonkBackTo
              ? [new Vector3(...bonkBackTo.lastExit)]
              : [
                  tilesComputed[currentTile.id]?.curves[0].getPointAt(0),
                  tilesComputed[currentTile.id]?.curves[0].getPointAt(1),
                ],
    [tilesComputed, currentTile, bonkBackTo],
  );

  useEffect(
    () =>
      // These need to update every frame, but we can't set state per frame,
      // nor do we want this component to render every frame, so subscribe to
      // "transient" updates, which doesn't trigger a re-render, but we can still
      // react to it
      useGameStore.subscribe((state) => {
        // Loop over the arrow positions calculated in the main render loop
        // in the top level Game component
        arrowPositions.forEach((_, i) => {
          const screenData = state.screenArrows[i];
          const arrowRef = arrowRefs.get(i);
          const htmlRef = htmlRefs.get(i);
          // I have no idea why this can happen - mount issues?
          if (!htmlRef) {
            return;
          }
          if (screenData && state.playerMomentum === 0 && !state.victory) {
            htmlRef.style.display = 'block';
            arrowRef?.position?.copy(screenData.position);
            if (htmlRef) {
              htmlRef.textContent = arrowLookup[screenData.arrow];
            }
            // If we calculated this arrow shouldn't be shown, hide it
          } else {
            htmlRef.style.display = 'none';
          }
        });
      }),
    [arrowRefs, htmlRefs, arrowPositions, currentTile],
  );

  // Not all of these arrows will get shown, they are dynamically hidden/shown
  // based on the per-frame calculation
  return arrowPositions.map((_, i) => (
    <group ref={setArrowRef(i)} key={i}>
      <Html>
        <div className={cx(styles.screenKey, 'key')} ref={setHtmlRefs(i)}></div>
      </Html>
    </group>
  ));
};

export default OnScreenArrows;
