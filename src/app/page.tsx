'use client'

import * as React from 'react';
console.log('rv', React.version)

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Dynamically import the ThreeScene component to avoid SSR issues
const ThreeScene = dynamic(() => import('@/components/Thrlex'), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-gray-900 text-white">
      <div className="flex flex-col items-center gap-4">
        <div className="text-xl font-bold">Loading 3D Scene...</div>
        <div className="text-sm text-gray-400">Initializing Three.js components</div>
      </div>
    </div>
  ),
})

export default function Home() {
  return (
    <main className="min-h-screen">
      <Suspense>
        <ThreeScene />
      </Suspense>
    </main>
  )
}

// Metadata for the page
// export const metadata = {
//   title: '3D Cube Demo',
//   description: 'A React Three Fiber demo with a rotating cube',
// }
