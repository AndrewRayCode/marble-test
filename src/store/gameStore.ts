import { computeTrackTile } from '@/util/curves';
import { calculateExitBuddies, deg2Rad, TileExit } from '@/util/math';
import { post } from '@/util/network';
import { Level as DbLevel } from '@prisma/client';
import { useKeyboardControls } from '@react-three/drei';
import { use, useEffect } from 'react';
import { CubicBezierCurve3, Vector3 } from 'three';
import { deserialize, serialize } from 'v8';
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

export type Level = Omit<DbLevel, 'id' | 'data'> & {
  id?: string;
  name: string;
  description: string;
  startingTileId: string;
  tiles: Tile[];
};

export const defaultTiles: Tile[] = [
  {
    id: '1',
    type: 'straight',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    showSides: 'all' as Side,
    connections: ['0', '5'],
    entrances: [1, 1],
  },
  // {
  //   id: 'a',
  //   type: 'tark',
  //   position: [0, 1, 0],
  //   rotation: [Math.PI / 2, 0, 0],
  //   actionType: 'hold',
  //   // action: {
  //   //   type: 'rotation',
  //   //   degrees: 90,
  //   //   targetTiles: ['16'],
  //   //   axis: 'z',
  //   // },
  // },
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

export const defaultLevel: Level = {
  name: 'Default level',
  description: 'Default level',
  startingTileId: '1',
  tiles: defaultTiles,
};

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

  levels: Level[];
  setLevelsFromDb: (levels: DbLevel[]) => void;
  createLevel: (level: Omit<Level, 'id'>) => Promise<void>;
  updateCurrentLevel: (level: Partial<Level>) => void;
  saveLevel: (level: Level) => Promise<void>;

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
  updateTileAndRecompute: <T extends Tile>(
    tileId: string,
    tile: Partial<T>,
  ) => void;
  updateTile: (tile: Tile) => void;
  showCursor: boolean;
  setShowCursor: (showCursor: boolean) => void;
  createType: Tile['type'];
  setCreateType: (createType: Tile['type']) => void;
  isInputFocused: boolean;
  setIsInputFocused: (isInputFocused: boolean) => void;

  // Game state
  gameStarted: boolean;
  setGameStarted: (gameStarted: boolean) => void;
  currentLevelId: string | null;
  setCurrentLevelId: (levelId: string) => void;
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
  autoSnap: (updatedComputed?: Record<string, TileComputed>) => void;

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

  resetLevel: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  debug: false,
  toggleDebug: () => set((state) => ({ debug: !state.debug })),

  levels: [],
  setLevelsFromDb: (dbLevels) =>
    set((s) => {
      return { levels: dbLevels.map((level) => deserializeLevel(level)) };
    }),
  createLevel: async (newLevel) => {
    const s = get();
    const { level } = await post('/api/levels/create', {
      level: serializeLevel(newLevel),
    });
    set({ levels: [...s.levels, deserializeLevel(level)] });
    s.setCurrentLevelId(level.id);
    s.resetLevel();
  },
  updateCurrentLevel: (data) =>
    set((s) => {
      const level = s.levels.find((l) => l.id === s.currentLevelId)!;
      return {
        levels: s.levels.map((l) =>
          l.id === s.currentLevelId ? { ...level, ...data } : l,
        ),
      };
    }),
  saveLevel: async (level) => {
    await post(`/api/levels/${level.id}/upsert`, {
      level: serializeLevel(level),
    });
  },

  buddies: [],
  setBuddies: (buddies) => set({ buddies }),

  isEditing: true,
  setIsEditing: (isEditing) => set({ isEditing }),
  selectedTileId: null,
  setSelectedTileId: (id) => set({ selectedTileId: id }),
  hoverTileId: null,
  setHoverTileId: (id) => set({ hoverTileId: id }),
  addTile: (tile) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    if (isRailTile(tile) || isJunctionTile(tile)) {
      s.setTileComputed(tile.id, computeTrackTile(tile));
    }
    s.updateCurrentLevel({ tiles: [...level.tiles, tile] });
  },
  deleteTile: (tileId: string) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    const tilesComputed = { ...s.tilesComputed };
    delete tilesComputed[tileId];
    s.setTilesComputed(tilesComputed);
    s.updateCurrentLevel({
      tiles: level.tiles.filter((tile) => tile.id !== tileId),
    });
  },
  updateTileAndRecompute: <T extends Tile>(
    tileId: string,
    update: Partial<T>,
  ) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    const t = level.tiles.find((tile) => tile.id === tileId) as T;
    if (!t) {
      return {};
    }
    const updated = { ...t, ...update } as T;
    const tiles = level.tiles.map((tile) =>
      tileId === tile.id ? updated : tile,
    );
    if (isRailTile(updated) || isJunctionTile(updated)) {
      s.setTileComputed(updated.id, computeTrackTile(updated));
    }
    s.updateCurrentLevel({ tiles });
  },
  updateTile: (tile) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    s.updateCurrentLevel({
      tiles: level.tiles.map((t) => (t.id === tile.id ? tile : t)),
    });
  },
  showCursor: false,
  setShowCursor: (showCursor) => set({ showCursor }),
  createType: 'straight',
  setCreateType: (createType) => set({ createType }),
  isInputFocused: false,
  setIsInputFocused: (isInputFocused) => set({ isInputFocused }),

  gameStarted: false,
  setGameStarted: (gameStarted) => set({ gameStarted }),
  currentLevelId: null,
  setCurrentLevelId: (currentLevelId) => set({ currentLevelId }),
  curveProgress: 0,
  setCurveProgress: (progress) => set({ curveProgress: progress }),
  currentTile: null,
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
  autoSnap: (updatedComputed) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    const tilesById = level.tiles.reduce<Record<string, Tile>>((acc, tile) => {
      acc[tile.id] = tile;
      return acc;
    }, {});

    // First produce the world position of all exits of tiles
    const tileExits = Object.entries(updatedComputed || s.tilesComputed).reduce<
      TileExit[]
    >((arr, [tileId, computed]) => {
      const tile = tilesById[tileId];
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
    }, []);

    // Then update the tile connections ("auto snap" them together)
    const [buddies, groups] = calculateExitBuddies(tileExits);
    Object.entries(buddies).forEach(([targetId, buds]) => {
      s.updateTile({
        ...tilesById[targetId],
        connections: buds.map((b) => (b ? b.tileId : null)) as StrDup,
        entrances: buds.map((b) => (b ? b.entranceIndex : null)) as NumDup,
      } as RailTile);
    });

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
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    action.targetTiles.forEach((targetId) => {
      const target = level.tiles.find((t) => t.id === targetId)!;
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
        // If a transform applies rotation, re-snap the updated positions. Note
        // right now this does not wait for any springs to come to rest, it
        // changes them instantly based on the target transform
        s.autoSnap(updatedComputed);
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

  resetLevel: () =>
    set((state) => {
      if (!state.currentLevelId) {
        return {};
      }
      const level = state.levels.find((l) => l.id === state.currentLevelId)!;
      const tilesComputed = level.tiles.reduce<Record<string, TileComputed>>(
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
        currentTile: level.tiles.find(
          (t) => t.id === level.startingTileId,
        ) as TrackTile,
      };
    }),
}));

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

export const serializeLevel = (level: Level) => {
  return {
    name: level.name,
    description: level.description,
    data: {
      tiles: level.tiles,
      startingTileId: level.startingTileId,
    },
  };
};

export const deserializeLevel = (level: DbLevel): Level => {
  const data = level.data as {
    tiles: Tile[];
    startingTileId: string;
  };
  return {
    id: level.id,
    name: level.name,
    description: level.description,
    tiles: data.tiles,
    startingTileId: data.startingTileId,
  };
};
