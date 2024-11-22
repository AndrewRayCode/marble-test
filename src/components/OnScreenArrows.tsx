'use client';

import { Html } from '@react-three/drei';

import { useEffect, useMemo, useRef } from 'react';
import { ScreenArrows, useGameStore } from '@/store/gameStore';

import styles from './styles.module.css';
import { useRefMap } from '@/util/react';
import { toWorld } from '@/util/math';

const arrowLookup = {
  left: '⭠',
  right: '⭢',
  up: '⭡',
  down: '⭣',
};

const OnScreenArrows = () => {
  const currentTile = useGameStore((state) => state.currentTile);
  const currentExitRefs = useGameStore((state) => state.currentExitRefs);
  const [arrowRefs, setArrowRef] = useRefMap();

  // Fetch initial state
  // const arrowsRef = useRef(useGameStore.getState().screenArrows);
  // Connect to the store on mount, disconnect on unmount, catch state-changes in a reference
  useEffect(
    () =>
      useGameStore.subscribe((state) => {
        state.screenArrows.forEach((arrow, i) => {
          arrowRefs.get(i)?.position?.copy(arrow.position);
          const html = arrowRefs.get(`${i}_text`) as HTMLDivElement;
          if (html) {
            html.textContent = arrowLookup[arrow.arrow];
          }
        });
      }),
    [arrowRefs],
  );

  const arrowPositions = useMemo(
    () => (currentTile?.type === 't' ? currentExitRefs.map(toWorld) : []),
    [currentExitRefs, currentTile],
  );

  return (
    <group>
      {arrowPositions.map((_, i) => (
        <group ref={setArrowRef(i)} key={i}>
          <Html>
            <div className={styles.key} ref={setArrowRef(`${i}_text`)}></div>
          </Html>
        </group>
      ))}
    </group>
  );
};

export default OnScreenArrows;
