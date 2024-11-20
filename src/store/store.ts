import { useEffect } from 'react';
import { CubicBezierCurve3, Group, Vector3 } from 'three';
import { create } from 'zustand';

export type RailTile = {
  id: string;
  type: 'straight' | 'quarter';
  position: [number, number, number];
  rotation: [number, number, number];
  showSides: 'all' | 'left' | 'right' | 'front' | 'back';
  // What this tile connects to, IDs of other tiles. [0] is negative direction
  // of travel, [1] is postive direction of travel.
  connections: (string | null)[];
  // What entrance number for each connection above is. For example, if this
  // tile connects to a T junction at the bottom, that's entrance index 1.
  entrances: (number | null)[];
};
export const isRailTile = (tile: Tile): tile is RailTile =>
  tile.type === 'straight' || tile.type === 'quarter';

export type ChoiceTile = {
  id: string;
  type: 't';
  position: [number, number, number];
  rotation: [number, number, number];
  showSides: 'all' | 'left' | 'right' | 'front' | 'back';
  connections: (string | null)[];
  entrances: (number | null)[];
};
export const isChoiceTile = (tile: Tile): tile is ChoiceTile =>
  tile.type === 't';

export type Tile = RailTile | ChoiceTile;

export type Level = Tile[];

export const level: Level = [
  {
    id: '1',
    type: 'straight',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    showSides: 'all',
    connections: ['0', '5'],
    entrances: [1, 1],
  },
  // T junction
  {
    id: '5',
    type: 't',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    showSides: 'all',
    connections: ['6', '1', '7'],
    entrances: [0, 1, 1],
  },
  // bottom left curve
  {
    id: '6',
    type: 'quarter',
    position: [-1, 1, 0],
    rotation: [0, 0, Math.PI / 2],
    showSides: 'all',
    connections: ['5', '10'],
    entrances: [0, 0],
  },
  // bottom right curve
  {
    id: '7',
    type: 'quarter',
    position: [1, 1, 0],
    rotation: [0, 0, Math.PI],
    showSides: 'all',
    connections: ['8', '5'],
    entrances: [1, 2],
  },
  // top right curve
  {
    id: '8',
    type: 'quarter',
    position: [1, 2, 0],
    rotation: [0, 0, -Math.PI / 2],
    showSides: 'all',
    connections: ['9', '7'],
    entrances: [0, 0],
  },
  // top straight
  {
    id: '9',
    type: 'straight',
    position: [0, 2, 0],
    rotation: [0, 0, Math.PI / 2],
    showSides: 'all',
    connections: ['8', '10'],
    entrances: [0, 1],
  },
  // top left curve
  {
    id: '10',
    type: 'quarter',
    position: [-1, 2, 0],
    rotation: [0, 0, 0],
    showSides: 'all',
    connections: ['6', '9'],
    entrances: [1, 1],
  },

  // bottom T junction
  {
    id: '0',
    type: 't',
    position: [0, -1, 0],
    rotation: [0, -Math.PI / 2, Math.PI],
    showSides: 'all',
    connections: ['17', '1', '16'],
    entrances: [1, 0, 1],
  },
  // front top curve
  {
    id: '16',
    type: 'quarter',
    position: [0, -1, -1],
    rotation: [0, -Math.PI / 2, 0],
    showSides: 'all',
    connections: ['110', '0'],
    entrances: [0, 2],
  },
  // top front curve
  {
    id: '17',
    type: 'quarter',
    position: [0, -1, 1],
    rotation: [0, Math.PI / 2, 0],
    showSides: 'all',
    connections: ['18', '0'],
    entrances: [1, 0],
  },
  // bottom front curve
  {
    id: '18',
    type: 'quarter',
    position: [0, -2, 1],
    rotation: [0, Math.PI / 2, Math.PI / 2],
    showSides: 'all',
    connections: ['19', '17'],
    entrances: [1, 0],
  },
  //
  {
    id: '19',
    type: 'straight',
    position: [0, -2, 0],
    rotation: [Math.PI / 2, 0, 0],
    showSides: 'all',
    connections: ['110', '18'],
    entrances: [1, 0],
  },
  // back bottom curve
  {
    id: '110',
    type: 'quarter',
    position: [0, -2, -1],
    rotation: [Math.PI / 2, Math.PI / 2, Math.PI / 2],
    showSides: 'all',
    connections: ['16', '19'],
    entrances: [0, 0],
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

  keysPressed: Set<string>;
  playerMomentum: number;
  setKeyPressed: (key: string, isPressed: boolean) => void;
  setMomentum: (delta: number) => void;
  enteredFrom: number;
  setEnteredFrom: (entrance: number) => void;
  nextConnection: number | null;
  setNextConnection: (entrance: number | null) => void;
  currentExitRefs: Group[];
  setCurrentExitRefs: (currentExitRefs: Group[]) => void;

  arrowPositions: Vector3[];
  setArrowPositions: (positions: Vector3[]) => void;

  resetLevel: (leveL: Level) => void;
}

export const useStore = create<Store>((set) => ({
  debug: true,
  toggleDebug: () => set((state) => ({ debug: !state.debug })),
  currentCurve: null,
  setCurrentCurve: (curve) => set({ currentCurve: curve }),
  level,
  setLevel: (level) => set({ level }),
  curveProgress: 0,
  setCurveProgress: (progress) => set({ curveProgress: progress }),
  currentTile: level[0],
  setCurrentTile: (tile) => set({ currentTile: tile }),

  keysPressed: new Set(),

  setKeyPressed: (key, isPressed) =>
    set((state) => {
      const newKeys = new Set(state.keysPressed);
      if (isPressed) {
        newKeys.add(key);
      } else {
        newKeys.delete(key);
      }
      return { keysPressed: newKeys };
    }),

  playerMomentum: 0,
  setMomentum: (playerMomentum) =>
    set(() => ({
      playerMomentum,
    })),
  // lowerMomentum: (delta) =>
  //   set((state) => {
  //     if (state.playerMomentum > 0) {
  //       return {
  //         playerMomentum: Math.max(state.playerMomentum - delta, 0),
  //       };
  //     } else {
  //       return {
  //         playerMomentum: Math.min(state.playerMomentum + delta, 0),
  //       };
  //     }
  //   }),

  enteredFrom: -1,
  setEnteredFrom: (enteredFrom) => set({ enteredFrom }),

  nextConnection: -1,
  setNextConnection: (nextConnection) => set({ nextConnection }),

  currentExitRefs: [],
  setCurrentExitRefs: (currentExitRefs) => set({ currentExitRefs }),

  arrowPositions: [],
  setArrowPositions: (arrowPositions) => set({ arrowPositions }),

  resetLevel: (level) =>
    set({
      level,
      curveProgress: 0,
      enteredFrom: -1,
      nextConnection: -1,
      playerMomentum: 0,
      currentCurve: null,
      currentTile: level[0],
    }),
}));

export const useKeyboardControls = () => {
  const { setKeyPressed } = useStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return; // Ignore key repeat events
      setKeyPressed(event.key, true);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      setKeyPressed(event.key, false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [setKeyPressed]);

  return useStore;
};
