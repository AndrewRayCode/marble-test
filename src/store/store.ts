import { CubicBezierCurve3 } from 'three';
import { create } from 'zustand';

export type Tile = {
  id: string;
  type: 'straight' | 'quarter';
  position: [number, number, number];
  rotation: [number, number, number];
  showSides: 'all' | 'left' | 'right' | 'front' | 'back';
  next: string[];
};

export type Level = Tile[];

export const level: Tile[] = [
  {
    id: '1',
    type: 'straight',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    showSides: 'all',
    next: ['2'],
  },
  {
    id: '2',
    type: 'quarter',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    showSides: 'all',
    next: ['3'],
  },
  {
    id: '3',
    type: 'straight',
    position: [1, 1, 0],
    rotation: [0, 0, -Math.PI / 2],
    showSides: 'all',
    next: ['4'],
  },
  {
    id: '4',
    type: 'quarter',
    position: [2, 1, 0],
    rotation: [0, 0, -Math.PI / 2],
    showSides: 'all',
    next: ['5'],
  },
  {
    id: '5',
    type: 'straight',
    position: [2, 0, 0],
    rotation: [0, 0, Math.PI],
    showSides: 'all',
    next: ['6'],
  },
  {
    id: '6',
    type: 'quarter',
    position: [2, -1, 0],
    rotation: [0, 0, Math.PI],
    showSides: 'all',
    next: ['7'],
  },
  {
    id: '7',
    type: 'straight',
    position: [1, -1, 0],
    rotation: [0, 0, Math.PI / 2],
    showSides: 'all',
    next: ['8'],
  },
  {
    id: '8',
    type: 'quarter',
    position: [0, -1, 0],
    rotation: [0, 0, Math.PI / 2],
    showSides: 'all',
    next: ['1'],
  },
];

export interface Store {
  debug: boolean;
  toggleDebug: () => void;
  currentCurve: CubicBezierCurve3 | null;
  setCurrentCurve: (curve: CubicBezierCurve3) => void;
  level: Level;
  setLevel: (level: Level) => void;
  curveProgress: number;
  setCurveProgress: (progress: number) => void;
  currentTile: Tile | null;
  setCurrentTile: (tile: Tile) => void;
}

export const useStore = create<Store>((set) => ({
  debug: false,
  toggleDebug: () => set((state) => ({ debug: !state.debug })),
  currentCurve: null,
  setCurrentCurve: (curve) => set({ currentCurve: curve }),
  level,
  setLevel: (level) => set({ level }),
  curveProgress: 0,
  setCurveProgress: (progress) => set({ curveProgress: progress }),
  currentTile: level[0],
  setCurrentTile: (tile) => set({ currentTile: tile }),
}));
