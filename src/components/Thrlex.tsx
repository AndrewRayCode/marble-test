'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { SPHERE_RADIUS } from '@/game/constants';
import {
  quarterCurve,
  QuarterTurn,
  Straightaway,
  straightCurve,
  translateCurve,
} from '@/game/curves';
import { useStore } from '@/store/store';

const Game = () => {
  const meshRef = useRef<Mesh>(null);

  const setCurrentCurve = useStore((state) => state.setCurrentCurve);
  const currentCurve = useStore((state) => state.currentCurve);
  const setCurveProgress = useStore((state) => state.setCurveProgress);
  const setCurrentTile = useStore((state) => state.setCurrentTile);
  const level = useStore((state) => state.level);

  // Start game :(
  useEffect(() => {
    console.log('Starting game');
    setCurrentCurve(translateCurve(straightCurve, new Vector3(0, -0.5, 0)));
  }, [setCurrentCurve]);

  useFrame((state, delta) => {
    if (meshRef.current && currentCurve) {
      const progress = Math.min(
        useStore.getState().curveProgress + delta * 1.1,
        1.0,
      );
      setCurveProgress(progress);

      // Get the point along the curve
      const point = currentCurve.getPoint(progress);

      // Update the sphere's position
      meshRef.current.position.copy(point);

      if (progress >= 1.0) {
        // Get the next tile
        const nextTile = level.find(
          (tile) => tile.id === useStore.getState().currentTile?.next[0],
        );
        if (nextTile) {
          setCurrentTile(nextTile);
          setCurveProgress(0);
          // Set the next curve
          setCurrentCurve(
            translateCurve(
              nextTile.type === 'straight' ? straightCurve : quarterCurve,
              new Vector3(
                nextTile.position[0],
                nextTile.position[1],
                nextTile.position[2],
              ),
            ),
          );
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
        backgroundBlurriness={0.3}
      />
      <mesh ref={meshRef}>
        <sphereGeometry args={[SPHERE_RADIUS, 256, 256]} />
        <meshStandardMaterial
          metalness={0.9}
          roughness={0.01}
          color="purple"
          envMapIntensity={0.5}
          emissive={0x222222}
        />
      </mesh>
      {level.map((tile) => {
        if (tile.type === 'straight') {
          return (
            <Straightaway
              key={tile.id}
              position={tile.position}
              rotation={tile.rotation}
            />
          );
        } else if (tile.type === 'quarter') {
          return (
            <QuarterTurn
              key={tile.id}
              position={tile.position}
              rotation={tile.rotation}
            />
          );
        }
      })}
      {/* <Straightaway /> */}
      {/* <QuarterTurn position={[0, 1, 0]} /> */}
      {/* <Straightaway position={[1, 1, 0]} rotation={[0, 0, Math.PI / 2]} /> */}
      <OrbitControls />
    </group>
  );
};

export default function ThreeScene() {
  const toggleDebug = useStore((state) => state.toggleDebug);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === 'd') {
        toggleDebug();
      }
    };
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, [toggleDebug]);

  return (
    <div className="h-screen w-full bg-gray-900">
      <Canvas camera={{ position: [0, 0, 6] }} className="h-full w-full">
        <Game />
      </Canvas>
    </div>
  );
}
