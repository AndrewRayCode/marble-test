'use server';

import { getLevels } from '@/repository/level';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const Game = dynamic(() => import('@/components/Game'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-gray-100 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="text-xl font-bold text-slate-900">Loading&hellip;</div>
      </div>
    </div>
  ),
});

export default async function Home() {
  const levels = await getLevels();

  return (
    <main className="min-h-screen">
      <Suspense>
        <Game dbLevels={levels} />
      </Suspense>
    </main>
  );
}

// Metadata for the page
// export const metadata = {
//   title: '3D Cube Demo',
//   description: 'A React Three Fiber demo with a rotating cube',
// }
