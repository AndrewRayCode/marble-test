import { useGameStore } from '@/store/gameStore';
import { useKeyboardControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Group as ThreeGroup, PerspectiveCamera, CubeTexture } from 'three';

export const useRefMap = <T>() => {
  const itemsRef = useRef(new Map<string | number, T>());

  const setRef = useCallback(
    (key: string | number) => (node: T) => {
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

export const useBackgroundRender = () => {
  const { camera, gl, scene } = useThree();

  const envRef = useRef<CubeTexture | null>(null);
  const cameraRef = useRef<PerspectiveCamera | null>(null);
  const gameObjectsRef = useRef<ThreeGroup>(null);

  // Create a persepective camera to render the scene background, and attach
  // it to the scene
  useLayoutEffect(() => {
    const backgroundCamera = new PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      1000,
      10000,
    );
    cameraRef.current = backgroundCamera;
    scene.add(backgroundCamera);
    return () => {
      scene.remove(backgroundCamera);
    };
  }, [scene]);

  const renderBackground = useCallback(() => {
    if (cameraRef.current) {
      // Copy the current scene background for later
      if (!envRef.current) {
        envRef.current = scene.background as CubeTexture;
      }
      // Hide all of the game objects
      gameObjectsRef.current!.visible = false;
      // Show the background
      scene.background = envRef.current;
      // Lock our camera to the scene camera
      cameraRef.current.position.copy(camera.position);
      cameraRef.current.quaternion.copy(camera.quaternion);
      // Render the background
      gl.autoClear = true;
      gl.render(scene, cameraRef.current);
      // Hide the background and show the game objects
      scene.background = null;
      gameObjectsRef.current!.visible = true;
      gl.autoClear = false;
    }
  }, [camera, gl, scene]);

  return [gameObjectsRef, renderBackground] as const;
};

export const useKeyPress = (key: string, action: () => void) => {
  const [sub] = useKeyboardControls();
  const isInputFocused = useGameStore((s) => s.isInputFocused);

  useEffect(() => {
    return sub(
      (state) => state[key],
      (pressed) => {
        if (pressed && !isInputFocused) {
          action();
        }
      },
    );
  }, [sub, action, key, isInputFocused]);
};
