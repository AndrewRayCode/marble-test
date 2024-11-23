'use client';

import { Html } from '@react-three/drei';
import { useEffect, useMemo } from 'react';
import cx from 'classnames';

import { useGameStore } from '@/store/gameStore';
import { useRefMap } from '@/util/react';
import { toWorld } from '@/util/math';

import styles from './styles.module.css';

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
  const currentTile = useGameStore((state) => state.currentTile);
  const currentExitRefs = useGameStore((state) => state.currentExitRefs);
  const [arrowRefs, setArrowRef] = useRefMap();

  // For every exit position of this junction, there is a *potential* arrow
  // to show
  const arrowPositions = useMemo(
    () => (currentTile?.type === 't' ? currentExitRefs.map(toWorld) : []),
    [currentExitRefs, currentTile],
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
          const htmlRef = arrowRefs.get(`${i}_text`) as HTMLDivElement;
          // I have no idea why this can happen - mount issues?
          if (!htmlRef) {
            return;
          }
          // If we calculated this arrow shouldn't be shown, hide it
          if (!screenData) {
            htmlRef.style.display = 'none';
            // Otherwise dynamically set its screen position and contents
          } else {
            htmlRef.style.display = 'block';
            arrowRef?.position?.copy(screenData.position);
            if (htmlRef) {
              htmlRef.textContent = arrowLookup[screenData.arrow];
            }
          }
        });
      }),
    [arrowRefs, arrowPositions],
  );

  // Not all of these arrows will get shown, they are dynamically hidden/shown
  // based on the per-frame calculation
  return arrowPositions.map((_, i) => (
    <group ref={setArrowRef(i)} key={i}>
      <Html>
        <div
          className={cx(styles.screenKey, 'key')}
          ref={setArrowRef(`${i}_text`)}
        ></div>
      </Html>
    </group>
  ));
};

export default OnScreenArrows;
