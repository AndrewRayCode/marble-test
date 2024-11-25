import { computeTrackTile } from '@/util/curves';
import { calculateExitBuddies, deg2Rad, TileExit } from '@/util/math';
import { useKeyboardControls } from '@react-three/drei';
import { useEffect } from 'react';
import { CubicBezierCurve3, Vector3 } from 'three';
import { create } from 'zustand';

export type Side = 'left' | 'right' | 'front' | 'back';

export type Transform = {
  position?: [number, number, number];
  rotation?: [number, number, number];
};

export type TileComputed = {
  curves: CubicBezierCurve3[];
  exits: Vector3[];
};

export type Action = {
  type: 'rotation';
  degrees: number;
  targetTiles: string[];
  axis: 'x' | 'y' | 'z';
};

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
  actionType: 'toggle' | 'click' | 'timed' | 'hold';
  action?: Action;
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
    // action: {
    //   type: 'rotation',
    //   degrees: 90,
    //   targetTiles: ['16'],
    //   axis: 'z',
    // },
  },
  {
    id: 'b',
    type: 'tark',
    position: [0, 2, 0],
    rotation: [Math.PI / 2, 0, 0],
    actionType: 'click',
    action: {
      type: 'rotation',
      degrees: 90,
      targetTiles: ['6'],
      axis: 'y',
    },
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

  buddies: TileExit[][];
  setBuddies: (buddies: TileExit[][]) => void;

  // Editor state
  hoverTileId: string | null;
  setHoverTileId: (id: string | null) => void;
  selectedTileId: string | null;
  setSelectedTileId: (id: string | null) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  addTile: (tile: Tile) => void;
  deleteTile: (tileId: string) => void;
  updateTile: <T extends Tile>(tileId: string, tile: Partial<T>) => void;
  showCursor: boolean;
  setShowCursor: (showCursor: boolean) => void;
  createType: Tile['type'];
  setCreateType: (createType: Tile['type']) => void;

  // Game state
  gameStarted: boolean;
  setGameStarted: (gameStarted: boolean) => void;
  level: Level;
  setLevel: (level: Level) => void;
  curveProgress: number;
  setCurveProgress: (progress: number) => void;
  currentTile: TrackTile | null;
  setCurrentTile: (tile: TrackTile) => void;
  currentCurveIndex: number;
  setCurrentCurveIndex: (index: number) => void;
  tilesComputed: Record<string, TileComputed>;
  setTileComputed: (tileId: string, computed: TileComputed) => void;
  setTilesComputed: (tiles: Record<string, TileComputed>) => void;

  playerMomentum: number;
  setMomentum: (delta: number) => void;
  enteredFrom: number;
  setEnteredFrom: (entrance: number) => void;
  nextConnection: number | null;
  setNextConnection: (entrance: number | null) => void;
  exitPositions: Record<string | number, Vector3[]>;
  setExitPositions: (tileId: string | number, exitPositions: Vector3[]) => void;
  autoSnap: () => void;

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
  applyAction: (action: Action) => void;

  transforms: Record<string, Transform>;
  setTransform: (id: string, transform: Transform) => void;
  clearTransform: (id: string, key?: keyof Transform) => void;

  // Game UI state
  arrowPositions: Vector3[];
  setArrowPositions: (positions: Vector3[]) => void;
  screenArrows: ScreenArrows;
  setScreenArrows: (arrows: ScreenArrows) => void;

  resetLevel: (leveL: Level) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  debug: false,
  toggleDebug: () => set((state) => ({ debug: !state.debug })),

  buddies: [],
  setBuddies: (buddies) => set({ buddies }),

  isEditing: true,
  setIsEditing: (isEditing) => set({ isEditing }),
  selectedTileId: null,
  setSelectedTileId: (id) => set({ selectedTileId: id }),
  hoverTileId: null,
  setHoverTileId: (id) => set({ hoverTileId: id }),
  addTile: (tile) =>
    set((state) => {
      const level = [...state.level, tile];
      if (isRailTile(tile) || isJunctionTile(tile)) {
        state.setTileComputed(tile.id, computeTrackTile(tile));
      }
      return { level };
    }),
  deleteTile: (tileId: string) =>
    set((state) => {
      const level = state.level.filter((tile) => tile.id !== tileId);
      const tilesComputed = { ...state.tilesComputed };
      delete tilesComputed[tileId];
      return { level };
    }),
  updateTile: <T extends Tile>(tileId: string, update: Partial<T>) =>
    set((state) => {
      const t = state.level.find((tile) => tile.id === tileId) as T;
      if (!t) {
        return {};
      }
      const updated = { ...t, ...update } as T;
      const level = state.level.map((tile) =>
        tileId === tile.id ? updated : tile,
      );
      if (isRailTile(updated) || isJunctionTile(updated)) {
        state.setTileComputed(updated.id, computeTrackTile(updated));
      }
      return { level };
    }),
  showCursor: false,
  setShowCursor: (showCursor) => set({ showCursor }),
  createType: 'straight',
  setCreateType: (createType) => set({ createType }),

  gameStarted: false,
  setGameStarted: (gameStarted) => set({ gameStarted }),
  level,
  setLevel: (level) => set({ level }),
  curveProgress: 0,
  setCurveProgress: (progress) => set({ curveProgress: progress }),
  currentTile: level[0] as TrackTile,
  setCurrentTile: (tile) => set({ currentTile: tile }),

  currentCurveIndex: 0,
  setCurrentCurveIndex: (currentCurveIndex) => set({ currentCurveIndex }),

  tilesComputed: {},
  setTileComputed: (tileId, computed) =>
    set((state) => ({
      tilesComputed: {
        ...state.tilesComputed,
        [tileId]: computed,
      },
    })),
  setTilesComputed: (tilesComputed) => set({ tilesComputed }),

  playerMomentum: 0,
  setMomentum: (playerMomentum) =>
    set(() => ({
      playerMomentum,
    })),

  enteredFrom: -1,
  setEnteredFrom: (enteredFrom) => set({ enteredFrom }),

  nextConnection: -1,
  setNextConnection: (nextConnection) => set({ nextConnection }),

  exitPositions: {},
  setExitPositions: (tileId, exitPositions) =>
    set((state) => ({
      exitPositions: {
        ...state.exitPositions,
        [tileId]: exitPositions,
      },
    })),
  autoSnap: () => {
    const s = get();

    const tileExits = Object.entries(s.tilesComputed).reduce<TileExit[]>(
      (arr, [tileId, computed]) => {
        const tile = s.level.find((t) => t.id === tileId);
        if (tile && (isRailTile(tile) || isJunctionTile(tile))) {
          return arr.concat(
            computed.exits.map((exit, i) => ({
              tileId,
              position: exit.toArray() as [number, number, number],
              entranceIndex: i,
            })),
          );
        }
        return arr;
      },
      [],
    );
    const [buddies, groups] = calculateExitBuddies(tileExits);
    // console.log(buddies);
    // if ('connections' in target) {
    Object.entries(buddies).forEach(([targetId, buds]) => {
      // const buds = buddies[targetId];
      s.updateTile<RailTile>(targetId, {
        connections: buds.map((b) => (b ? b.tileId : null)) as StrDup,
        entrances: buds.map((b) => (b ? b.entranceIndex : null)) as NumDup,
      });
    });
    // }

    s.setBuddies(groups);
  },

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
  applyAction: (action) => {
    const s = get();
    action.targetTiles.forEach((targetId) => {
      const target = s.level.find((t) => t.id === targetId)!;
      if (action!.type === 'rotation') {
        const start = s.transforms[targetId]?.rotation ||
          target?.rotation || [0, 0, 0];
        const { axis, degrees } = action;
        const rad = deg2Rad(degrees);
        const rotation = [
          start[0] + (axis === 'x' ? rad : 0),
          start[1] + (axis === 'y' ? rad : 0),
          start[2] + (axis === 'z' ? rad : 0),
        ] as [number, number, number];
        const transform = {
          ...s.transforms[targetId],
          rotation,
        };

        const updatedComputed = {
          ...s.tilesComputed,
          [targetId]: computeTrackTile(target as RailTile, transform),
        };

        s.setTilesComputed(updatedComputed);
        s.setTransform(targetId, transform);
        s.autoSnap();
      }
    });
  },

  transforms: {},
  setTransform: (id, transform) =>
    set((state) => ({
      transforms: {
        ...state.transforms,
        [id]: transform,
      },
    })),
  clearTransform: (id, key) =>
    set((state) => {
      if (key) {
        const transform = state.transforms[id];
        delete transform[key];
        return {
          transforms: {
            ...state.transforms,
            [id]: transform,
          },
        };
      } else {
        const transforms = { ...state.transforms };
        delete transforms[id];
        return { transforms };
      }
    }),

  arrowPositions: [],
  setArrowPositions: (arrowPositions) => set({ arrowPositions }),
  screenArrows: [],
  setScreenArrows: (screenArrows) => set({ screenArrows }),

  resetLevel: (level) =>
    set((state) => {
      const tilesComputed = level.reduce<Record<string, TileComputed>>(
        (acc, tile) =>
          isRailTile(tile) || isJunctionTile(tile)
            ? {
                ...acc,
                [tile.id]: computeTrackTile(tile),
              }
            : acc,
        {},
      );

      return {
        level,
        curveProgress: 0,
        enteredFrom: -1,
        nextConnection: -1,
        playerMomentum: 0,
        tilesComputed,
        currentTile: level.find((l) => l.id === '1') as TrackTile,
      };
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
