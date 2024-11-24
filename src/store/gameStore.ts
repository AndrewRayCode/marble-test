import { useKeyboardControls } from '@react-three/drei';
import { useEffect } from 'react';
import { CubicBezierCurve3, Group, Vector3 } from 'three';
import { create } from 'zustand';

type PartialOfUnion<T> = T extends infer U ? Partial<U> : never;

export type Side = 'left' | 'right' | 'front' | 'back';

export type TileBase = {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  type: string;
};

export type TarkTile = TileBase & {
  position: [number, number, number];
  rotation: [number, number, number];
  type: 'tark';
  actionType: 'toggle' | 'timed' | 'hold';
};

type NullStr = string | null;
type NullNum = number | null;
export type StrTrip = [NullStr, NullStr, NullStr];
export type StrDup = [NullStr, NullStr];
export type NumTrip = [NullNum, NullNum, NullNum];
export type NumDup = [NullNum, NullNum];

export type RailTile = TileBase & {
  type: 'straight' | 'quarter';
  showSides: Side;
  // What this tile connects to, IDs of other tiles. [0] is negative direction
  // of travel, [1] is postive direction of travel.
  connections: StrDup;
  // What entrance number for each connection above is. For example, if this
  // tile connects to a T junction at the bottom, that's entrance index 1.
  entrances: NumDup;
};

export const isRailTile = (tile: Tile): tile is RailTile =>
  tile.type === 'straight' || tile.type === 'quarter';

let idx = 20;
export const makeId = () => (idx++).toString();

export type JunctionTile = TileBase & {
  type: 't';
  showSides: Side;
  connections: StrTrip;
  entrances: NumTrip;
};
export const isJunctionTile = (tile: Tile): tile is JunctionTile =>
  tile.type === 't';

// Only tiles the player can roll / travel on
export type TrackTile = RailTile | JunctionTile;
// All valid level tiles
export type Tile = RailTile | JunctionTile | TarkTile;

export type Level = Tile[];

export const level: Level = [
  {
    id: '1',
    type: 'straight',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    showSides: 'all' as Side,
    connections: ['0', '5'],
    entrances: [1, 1],
  },
  {
    id: 'a',
    type: 'tark',
    position: [0, 1, 0],
    rotation: [Math.PI / 2, 0, 0],
    actionType: 'hold',
  },
  {
    id: 'b',
    type: 'tark',
    position: [0, 2, 0],
    rotation: [Math.PI / 2, 0, 0],
    actionType: 'toggle',
  },
  // T junction
  {
    id: '5',
    type: 't',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    showSides: 'all' as Side,
    connections: ['6', '1', '7'],
    entrances: [0, 1, 1],
  },
  // bottom left curve
  {
    id: '6',
    type: 'quarter',
    position: [-1, 1, 0],
    rotation: [0, 0, Math.PI / 2],
    showSides: 'all' as Side,
    connections: ['5', '10'],
    entrances: [0, 0],
  },
  // bottom right curve
  {
    id: '7',
    type: 'quarter',
    position: [1, 1, 0],
    rotation: [0, 0, Math.PI],
    showSides: 'all' as Side,
    connections: ['8', '5'],
    entrances: [1, 2],
  },
  // top right curve
  {
    id: '8',
    type: 'quarter',
    position: [1, 2, 0],
    rotation: [0, 0, -Math.PI / 2],
    showSides: 'all' as Side,
    connections: ['9', '7'],
    entrances: [0, 0],
  },
  // top straight
  {
    id: '9',
    type: 'straight',
    position: [0, 2, 0],
    rotation: [0, 0, Math.PI / 2],
    showSides: 'all' as Side,
    connections: ['8', '10'],
    entrances: [0, 1],
  },
  // top left curve
  {
    id: '10',
    type: 'quarter',
    position: [-1, 2, 0],
    rotation: [0, 0, 0],
    showSides: 'all' as Side,
    connections: ['6', '9'],
    entrances: [1, 1],
  },

  // bottom T junction
  {
    id: '0',
    type: 't',
    position: [0, -1, 0],
    rotation: [0, -Math.PI / 2, Math.PI],
    showSides: 'all' as Side,
    connections: ['17', '1', '16'],
    entrances: [1, 0, 1],
  },
  // front top curve
  {
    id: '16',
    type: 'quarter',
    position: [0, -1, -1],
    rotation: [0, -Math.PI / 2, 0],
    showSides: 'all' as Side,
    connections: ['110', '0'],
    entrances: [0, 2],
  },
  // top front curve
  {
    id: '17',
    type: 'quarter',
    position: [0, -1, 1],
    rotation: [0, Math.PI / 2, 0],
    showSides: 'all' as Side,
    connections: ['18', '0'],
    entrances: [1, 0],
  },
  // bottom front curve
  {
    id: '18',
    type: 'quarter',
    position: [0, -2, 1],
    rotation: [0, Math.PI / 2, Math.PI / 2],
    showSides: 'all' as Side,
    connections: ['19', '17'],
    entrances: [1, 0],
  },
  //
  {
    id: '19',
    type: 'straight',
    position: [0, -2, 0],
    rotation: [Math.PI / 2, 0, 0],
    showSides: 'all' as Side,
    connections: ['110', '18'],
    entrances: [1, 0],
  },
  // back bottom curve
  {
    id: '110',
    type: 'quarter',
    position: [0, -2, -1],
    rotation: [Math.PI / 2, Math.PI / 2, Math.PI / 2],
    showSides: 'all' as Side,
    connections: ['16', '19'],
    entrances: [0, 0],
  },
];

export type ScreenArrow = {
  d: number;
  position: Vector3;
  entrance: number;
  arrow: 'up' | 'down' | 'left' | 'right';
};
export type ScreenArrows = ScreenArrow[];

export interface GameStore {
  debug: boolean;
  toggleDebug: () => void;

  // Editor state
  hoverTileId: string | null;
  setHoverTileId: (id: string | null) => void;
  selectedTileId: string | null;
  setSelectedTileId: (id: string | null) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  addTile: (tile: Tile) => void;
  deleteTile: (tileId: string) => void;
  updateTile: (tileId: string, tile: Partial<Tile>) => void;
  showCursor: boolean;
  setShowCursor: (showCursor: boolean) => void;
  createType: Tile['type'];
  setCreateType: (createType: Tile['type']) => void;

  // Game state
  gameStarted: boolean;
  setGameStarted: (gameStarted: boolean) => void;
  currentCurve: CubicBezierCurve3 | null;
  setCurrentCurve: (curve: CubicBezierCurve3) => void;
  level: Level;
  setLevel: (level: Level) => void;
  curveProgress: number;
  setCurveProgress: (progress: number) => void;
  currentTile: TrackTile | null;
  setCurrentTile: (tile: TrackTile) => void;

  playerMomentum: number;
  setMomentum: (delta: number) => void;
  enteredFrom: number;
  setEnteredFrom: (entrance: number) => void;
  nextConnection: number | null;
  setNextConnection: (entrance: number | null) => void;
  currentExitRefs: Group[];
  setCurrentExitRefs: (currentExitRefs: Group[]) => void;

  booleanSwitches: Record<string, boolean>;
  setBooleanSwitch: (key: string, value: boolean) => void;
  enabledBooleanSwitchesFor: Record<
    string | number,
    Record<string | number, boolean>
  >;
  setEnabledBooleanSwitchesFor: (
    actorId: string | number,
    switchId: string | number,
    enabled: boolean,
  ) => void;

  // Game UI state
  arrowPositions: Vector3[];
  setArrowPositions: (positions: Vector3[]) => void;
  screenArrows: ScreenArrows;
  setScreenArrows: (arrows: ScreenArrows) => void;

  resetLevel: (leveL: Level) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  debug: false,
  toggleDebug: () => set((state) => ({ debug: !state.debug })),

  isEditing: true,
  setIsEditing: (isEditing) => set({ isEditing }),
  selectedTileId: null,
  setSelectedTileId: (id) => set({ selectedTileId: id }),
  hoverTileId: null,
  setHoverTileId: (id) => set({ hoverTileId: id }),
  addTile: (tile) =>
    set((state) => {
      const level = [...state.level, tile];
      return { level };
    }),
  deleteTile: (tileId: string) =>
    set((state) => {
      const level = state.level.filter((tile) => tile.id !== tileId);
      return { level };
    }),
  updateTile: <T extends Tile>(tileId: string, update: Partial<T>) =>
    set((state) => {
      const level = state.level.map((tile) =>
        tileId === tile.id ? ({ ...tile, ...update } as T) : tile,
      );
      return { level };
    }),
  showCursor: false,
  setShowCursor: (showCursor) => set({ showCursor }),
  createType: 'straight',
  setCreateType: (createType) => set({ createType }),

  gameStarted: false,
  setGameStarted: (gameStarted) => set({ gameStarted }),
  currentCurve: null,
  setCurrentCurve: (curve) => set({ currentCurve: curve }),
  level,
  setLevel: (level) => set({ level }),
  curveProgress: 0,
  setCurveProgress: (progress) => set({ curveProgress: progress }),
  currentTile: level[0] as TrackTile,
  setCurrentTile: (tile) => set({ currentTile: tile }),

  playerMomentum: 0,
  setMomentum: (playerMomentum) =>
    set(() => ({
      playerMomentum,
    })),

  enteredFrom: -1,
  setEnteredFrom: (enteredFrom) => set({ enteredFrom }),

  nextConnection: -1,
  setNextConnection: (nextConnection) => set({ nextConnection }),

  currentExitRefs: [],
  setCurrentExitRefs: (currentExitRefs) => set({ currentExitRefs }),

  booleanSwitches: {},
  setBooleanSwitch: (key, value) =>
    set((state) => ({
      booleanSwitches: {
        ...state.booleanSwitches,
        [key]: value,
      },
    })),
  enabledBooleanSwitchesFor: {},
  setEnabledBooleanSwitchesFor: (actorId, switchId, enabled) =>
    set((state) => {
      const enabledBooleanSwitchesFor = {
        ...state.enabledBooleanSwitchesFor,
        [actorId]: {
          ...state.enabledBooleanSwitchesFor[actorId],
          [switchId]: enabled,
        },
      };
      return { enabledBooleanSwitchesFor };
    }),

  arrowPositions: [],
  setArrowPositions: (arrowPositions) => set({ arrowPositions }),
  screenArrows: [],
  setScreenArrows: (screenArrows) => set({ screenArrows }),

  resetLevel: (level) =>
    set({
      level,
      curveProgress: 0,
      enteredFrom: -1,
      nextConnection: -1,
      playerMomentum: 0,
      currentCurve: null,
      currentTile: level[0] as TrackTile,
    }),
}));

export const useKeyPress = (key: string, action: () => void) => {
  const [sub] = useKeyboardControls();
  useEffect(() => {
    return sub(
      (state) => state[key],
      (pressed) => {
        if (pressed) {
          action();
        }
      },
    );
  }, [sub, action, key]);
};
