import { computeTrackTile } from '@/util/curves';
import { calculateExitBuddies, deg2Rad, TileExit } from '@/util/math';
import { post } from '@/util/network';
import { Level as DbLevel } from '@prisma/client';
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

export type ActionAxis = 'x' | 'y' | 'z';
export type RotateAction = {
  type: 'rotation';
  degrees: number;
  targetTiles: string[];
  axis: ActionAxis;
};
export type GateActionType = 'toggle' | 'open' | 'close';
export type GateAction = {
  type: 'gate';
  targetTiles: string[];
  gateAction: GateActionType;
};
export type Action = RotateAction | GateAction;
export type ActionType = Action['type'];

export const defaultAction = {
  type: 'rotation',
  degrees: 90,
  targetTiles: [],
  axis: 'y' as ActionAxis,
};

export type TileBase = {
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  type: string;
};

export type ButtonActionType = 'toggle' | 'click' | 'timed' | 'hold';
export type ButtonTile = TileBase & {
  position: [number, number, number];
  rotation: [number, number, number];
  type: 'button';
  actionType: ButtonActionType;
  actions: Action[];
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

export type CapTile = TileBase & {
  type: 'cap';
  showSides: Side;
  connections: [NullStr];
  entrances: [NullNum];
};

export type BoxTile = TileBase & {
  type: 'box';
  color: string;
};

export type CoinTile = TileBase & {
  type: 'coin';
};

export type GateState = 'open' | 'closed';
export type GateTile = TileBase & {
  type: 'gate';
  defaultState: GateState;
};

export const isRailTile = (tile: Tile): tile is RailTile =>
  tile.type === 'straight' || tile.type === 'quarter' || tile.type === 'cap';

let idx = 20;
export const makeId = () =>
  (idx++).toString() + '_' + Date.now().toString().substring(10);

export type JunctionTile = TileBase & {
  type: 't';
  showSides: Side;
  connections: StrTrip;
  entrances: NumTrip;
};
export const isJunctionTile = (tile: Tile): tile is JunctionTile =>
  tile.type === 't';

// Only tiles the player can roll / travel on
export type TrackTile = RailTile | JunctionTile | CapTile;
// All valid level tiles
export type Tile = TrackTile | ButtonTile | BoxTile | CoinTile | GateTile;

export type Level = Omit<DbLevel, 'id' | 'data'> & {
  id?: string;
  name: string;
  description: string;
  startingTileId: string;
  tiles: Tile[];
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
  debugPoints: { position: [number, number, number]; color: string }[];
  setDebugPoints: (
    points: { position: [number, number, number]; color: string }[],
  ) => void;

  // Editor state
  hoverTileId: string | null;
  setHoverTileId: (id: string | null) => void;
  selectedTileId: string | null;
  setSelectedTileId: (id: string | null) => void;
  isEditing: boolean;
  setIsEditing: (isEditing: boolean) => void;
  addTile: (tile: Tile) => void;
  deleteTile: (tileId: string) => void;
  updateTileAction: <T extends Action>(
    tileId: string,
    actionIdx: number,
    action: Partial<T>,
  ) => void;
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
  applyAction: (tile: Tile, action: Action) => void;
  clearAction: (tile: Tile, action: Action) => void;

  transforms: Record<string, Transform>;
  setTransform: (id: string, transform: Transform) => void;
  clearTransform: (id: string, key?: keyof Transform) => void;

  // Game UI state
  arrowPositions: Vector3[];
  setArrowPositions: (positions: Vector3[]) => void;
  screenArrows: ScreenArrows;
  setScreenArrows: (arrows: ScreenArrows) => void;

  collectedItems: Set<string>;
  collectItem: (id: string) => void;

  gateStates: Record<string, GateState>;
  setGateState: (id: string, state: GateState) => void;
  clearGateState: (id: string) => void;

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
  debugPoints: [],
  setDebugPoints: (debugPoints) => set({ debugPoints }),

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
  updateTileAction: (tileId, actionIdx, action) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    const t = level.tiles.find((tile) => tile.id === tileId) as ButtonTile;
    const updated: ButtonTile = {
      ...t,
      actions: t.actions.map((a, i) =>
        i === actionIdx ? { ...a, ...action } : a,
      ),
    };
    const tiles = level.tiles.map((tile) =>
      tileId === tile.id ? updated : tile,
    );
    s.updateCurrentLevel({ tiles });
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
  setCurrentLevelId: (currentLevelId) => {
    set({ currentLevelId });
    get().resetLevel();
    get().autoSnap();
  },
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
  applyAction: (tile, action) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    if (action.type === 'rotation') {
      action.targetTiles.forEach((targetId) => {
        const target = level.tiles.find((t) => t.id === targetId)!;
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
      });
    } else if (action.type === 'gate') {
      action.targetTiles.forEach((targetId) => {
        const target = level.tiles.find((t) => t.id === targetId)!;
        if (action.gateAction === 'toggle') {
          const gs =
            s.gateStates[targetId] || (target as GateTile).defaultState;
          s.setGateState(targetId, gs === 'open' ? 'closed' : 'open');
        } else {
          s.setGateState(
            targetId,
            action.gateAction === 'open' ? 'closed' : 'open',
          );
        }
      });
    }
  },
  clearAction: (tile, action) => {
    const s = get();
    action.targetTiles.forEach((targetId) => {
      if (action.type === 'rotation') {
        s.clearTransform(tile.id, action.type);
      } else if (action.type === 'gate') {
        s.clearGateState(targetId);
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

  collectedItems: new Set(),
  collectItem: (id) =>
    set((state) => {
      state.collectedItems.add(id);
      return { collectedItems: state.collectedItems };
    }),

  gateStates: {},
  setGateState: (id, state) =>
    set((s) => ({
      gateStates: {
        ...s.gateStates,
        [id]: state,
      },
    })),
  clearGateState: (id) =>
    set((s) => {
      const gateStates = { ...s.gateStates };
      delete gateStates[id];
      return { gateStates };
    }),

  resetLevel: () =>
    set((state) => {
      if (!state.currentLevelId) {
        return {};
      }
      set({ transforms: {} });

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

      const currentTile = level.tiles.find(
        (t) => t.id === level.startingTileId,
      ) as TrackTile;
      console.log('Game reset! Starting on', { currentTile });
      return {
        level,
        curveProgress:
          currentTile.type === 'cap' || currentTile.type === 't' ? 1 : 0,
        currentCurveIndex: 0,
        enteredFrom: currentTile.type === 't' ? 0 : -1,
        // TODO: Need a starting connection too!
        nextConnection: currentTile.type === 'cap' ? 1 : 0,
        playerMomentum: 0,
        debugPoints: [],
        collectedItems: new Set(),
        gateStates: {},
        tilesComputed,
        currentTile,
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
    // @ts-expect-error migration
    tiles: data.tiles.map((t) => ({
      ...t,
      // @ts-expect-error migration
      ...(t.type === 'tark' ? { type: 'button' } : {}),
      // @ts-expect-error migration
      ...(t.action ? { actions: [t.action] } : {}),
    })),
    startingTileId: data.startingTileId,
  };
};
