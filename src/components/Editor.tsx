'use client';

import { useEffect, useRef, useState } from 'react';
import type { TransformControls as TransformControlsImpl } from 'three-stdlib';
import { TransformControls, Grid, KeyboardControls } from '@react-three/drei';

import { useGameStore } from '@/store/gameStore';

import cx from 'classnames';
import { useRefMap } from '@/util/react';

type EditorProps = {
  setOrbitEnabled: (enabled: boolean) => void;
};

const Editor = ({ setOrbitEnabled }: EditorProps) => {
  const level = useGameStore((state) => state.level);
  const selectedTileId = useGameStore((state) => state.selectedTileId);
  const setSelectedTileId = useGameStore((state) => state.setSelectedTileId);
  const hoverTileId = useGameStore((state) => state.hoverTileId);
  const setHoverTileId = useGameStore((state) => state.setHoverTileId);
  const updateTile = useGameStore((state) => state.updateTile);
  const [tileRefs, setTileRefs] = useRefMap();

  const transform = useRef<TransformControlsImpl>(null);
  const [mode, setMode] = useState('translate');
  useEffect(() => {
    if (transform.current) {
      const controls = transform.current;
      controls.setMode(mode);
      const callback = (event: { value: unknown }) => {
        setOrbitEnabled(!event.value);
      };
      // @ts-expect-error - types are wrong in addEventListener
      controls.addEventListener('dragging-changed', callback);
      // @ts-expect-error - types are wronng in addEventListener
      return () => controls.removeEventListener('dragging-changed', callback);
    }
  }, [mode, setOrbitEnabled]);

  return (
    <group>
      <Grid args={[10.5, 10.5]} />
      {selectedTileId !== null && (
        <TransformControls
          mode="translate"
          translationSnap={0.5}
          ref={transform}
          object={tileRefs.get(selectedTileId)}
          onChange={(e) => {
            const target = tileRefs.get(selectedTileId);
            if (target) {
              updateTile(selectedTileId, {
                position: [
                  target.position.x,
                  target.position.y,
                  target.position.z,
                ],
              });
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
              if (tile.id !== selectedTileId) {
                e.stopPropagation();
                setSelectedTileId(tile.id);
              }
            }}
            onPointerOver={(e) => {
              if (tile.id !== hoverTileId) {
                e.stopPropagation();
                setHoverTileId(tile.id);
              }
            }}
            onPointerOut={(e) => {
              if (tile.id === hoverTileId) {
                e.stopPropagation();
                setHoverTileId(null);
              }
            }}
            ref={setTileRefs(tile.id)}
          >
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

export const EditorUI = ({ children }: { children: React.ReactNode }) => {
  const hoverTileId = useGameStore((state) => state.hoverTileId);

  return (
    <div
      className={cx('h-screen w-full', {
        'cursor-pointer': hoverTileId !== null,
      })}
    >
      {children}
    </div>
  );
};

export default function EditorComponent(props: EditorProps) {
  return (
    <KeyboardControls map={[{ name: 'gridRotate', keys: ['g'] }]}>
      <Editor {...props} />
    </KeyboardControls>
  );
}
