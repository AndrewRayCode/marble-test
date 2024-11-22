'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the ThreeScene component to avoid SSR issues
const ThreeScene = dynamic(() => import('@/components/Game'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="text-xl font-bold text-slate-900">Loading&hellip;</div>
        <div className="text-sm text-slate-600  ">
          Initializing Three.js components
        </div>
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense>
        <ThreeScene />
      </Suspense>
    </main>
  );
}

// Metadata for the page
// export const metadata = {
//   title: '3D Cube Demo',
//   description: 'A React Three Fiber demo with a rotating cube',
// }
