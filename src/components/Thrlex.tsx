'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { SPHERE_RADIUS } from '@/game/constants';
import { QuarterTurn, Straightaway, straightCurve } from '@/game/curves';

const Game = () => {
  const meshRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Calculate progress (0 to 1)
      const progress = state.clock.getElapsedTime() % 1;

      // Get the point along the curve
      const point = straightCurve.getPoint(progress);

      // Move it down
      point.subVectors(point, new Vector3(0.0, 0.5, 0.0));

      // Update the sphere's position
      // meshRef.current.position.copy(point);
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
        {/* <boxGeometry args={[1, 1, 1]} /> */}
        <meshStandardMaterial
          metalness={0.9}
          roughness={0.01}
          color="purple"
          envMapIntensity={0.5}
          emissive={0x222222}
        />
      </mesh>

      <Straightaway />
      <QuarterTurn position={[0, 1, 0]} />
      <Straightaway position={[1, 1, 0]} rotation={[0, 0, Math.PI / 2]} />
      <OrbitControls />
    </group>
  );
};

export default function ThreeScene() {
  return (
    <div className="h-screen w-full bg-gray-900">
      <Canvas camera={{ position: [0, 0, 6] }} className="h-full w-full">
        <Game />
      </Canvas>
    </div>
  );
}
