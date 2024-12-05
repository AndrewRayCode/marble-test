import { computeTrackTile } from '@/util/curves';
import { calculateExitBuddies, deg2Rad, TileExit } from '@/util/math';
import { post } from '@/util/network';
import { Level as DbLevel } from '@prisma/client';
import { CubicBezierCurve3, Euler, Vector3 } from 'three';
import { create } from 'zustand';

export type Side = 'left' | 'right' | 'front' | 'back';

export type Transform = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

export type TileComputed = {
  position: Vector3;
  rotation: Euler;
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
export type TranslateAction = {
  type: 'translation';
  offset: [string, string, string];
  targetTiles: string[];
};
export type GateActionType = 'toggle' | 'open' | 'close';
export type GateAction = {
  type: 'gate';
  targetTiles: string[];
  gateAction: GateActionType;
};
export type Action = RotateAction | TranslateAction | GateAction;
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
  scale?: [number, number, number];
  parentId: string | null;
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

export type GroupTile = TileBase & {
  type: 'group';
};

export type BoxTile = TileBase & {
  type: 'box';
  style?: 'grass' | 'solid';
  color: string;
};

export type SphereTile = TileBase & {
  type: 'sphere';
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

export type DirectionBehavior = 'right' | 'left' | 'random' | 'stop';
export type DeadEndBehavior = 'bounce' | 'stop';
export type HitBehavior = 'bounce' | 'stop';
export type FriendTile = TileBase & {
  startingTileId: string | null;
  type: 'friend';
  directionBehavior: DirectionBehavior;
  deadEndBehavior: DeadEndBehavior;
  hitBehavior: HitBehavior;
  speed: string;
  startingDirection: 1 | -1;
  color: string;
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
export type Tile =
  | TrackTile
  | ButtonTile
  | BoxTile
  | GroupTile
  | SphereTile
  | CoinTile
  | GateTile
  | FriendTile;

export type Level = Omit<DbLevel, 'id' | 'data'> & {
  id?: string;
  name: string;
  description: string;
  startingTileId: string;
  tiles: Tile[];
};

export type ScreenArrow = {
  position: Vector3;
  entrance: number;
  arrow: 'up' | 'down' | 'left' | 'right';
};
export type ScreenArrows = ScreenArrow[];

export const PLAYER_ID = '__player__';

export type SemiDynamicState = {
  momentum: number;
  enteredFrom: number;
  nextConnection: number | null;
  currentCurveIndex: number;
  currentTileId: string | null;
};
export const consSemiDynamicState = (): SemiDynamicState => ({
  momentum: 0,
  enteredFrom: -1,
  nextConnection: -1,
  currentCurveIndex: 0,
  currentTileId: null,
});
export type DynamicState = {
  curveProgress: number;
  position: [number, number, number];
};
const consDynamicState = (): DynamicState => ({
  curveProgress: 0.5,
  position: [0, 0, 0],
});

export interface GameState {
  debug: boolean;
  toggleDebug: () => void;

  levels: Level[];
  setLevelsFromDb: (levels: DbLevel[]) => void;
  createLevel: (level: Omit<Level, 'id'>) => Promise<void>;
  updateCurrentLevel: (level: Partial<Level>) => void;
  saveLevel: (level: Level) => Promise<void>;
  deleteLevel: (levelId: string) => Promise<void>;

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
  groupTile: (tileId: string, parentId: string) => void;
  ungroupTile: (tileId: string) => void;
  updateTileAction: <T extends Action>(
    tileId: string,
    actionIdx: number,
    action: Partial<T>,
  ) => void;
  setTileAction: (tileId: string, actionIdx: number, action: Action) => void;
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
  tilesComputed: Record<string, TileComputed>;
  setTileComputed: (tileId: string, computed: TileComputed) => void;
  setTilesComputed: (tiles: Record<string, TileComputed>) => void;

  semiDynamicObjects: Record<string, SemiDynamicState>;
  dynamicObjects: Record<string, DynamicState>;
  initiateDynamicObject: (
    objectId: string,
    position: [number, number, number],
  ) => void;
  setCurveProgress: (objectId: string, progress: number) => void;
  setCurrentTileId: (objectId: string, id: string) => void;
  setCurrentCurveIndex: (objectId: string, index: number) => void;
  setMomentum: (objectId: string, momentum: number) => void;
  setEnteredFrom: (objectId: string, entrance: number) => void;
  setNextConnection: (objectId: string, entrance: number | null) => void;
  setPosition: (objectId: string, position: [number, number, number]) => void;

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

  collectedItems: Set<string>;
  collectItem: (id: string) => void;

  gateStates: Record<string, GateState>;
  setGateState: (id: string, state: GateState) => void;
  clearGateState: (id: string) => void;

  bonkBackTo: {
    nextDirection: 1 | -1;
    lastExit: [number, number, number];
  } | null;
  setBonkBackTo: (bbt: {
    nextDirection: 1 | -1;
    lastExit: [number, number, number];
  }) => void;
  clearBonkBackTo: () => void;

  resetLevel: () => void;

  // Game UI state
  arrowPositions: Vector3[];
  setArrowPositions: (positions: Vector3[]) => void;
  screenArrows: ScreenArrows;
  setScreenArrows: (arrows: ScreenArrows) => void;

  victory: boolean;
  setVictory: (victory: boolean) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
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
  deleteLevel: async (levelId) => {
    await post(`/api/levels/${levelId}/delete`);
    set((s) => ({
      levels: s.levels.filter((l) => l.id !== levelId),
      currentLevelId: null,
    }));
  },

  buddies: [],
  setBuddies: (buddies) => set({ buddies }),
  debugPoints: [],
  setDebugPoints: (debugPoints) => set({ debugPoints }),

  isEditing: true,
  setIsEditing: (isEditing) => set({ isEditing, victory: false }),
  selectedTileId: null,
  setSelectedTileId: (id) => set({ selectedTileId: id }),
  hoverTileId: null,
  setHoverTileId: (id) => set({ hoverTileId: id }),
  addTile: (tile) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    if (isRailTile(tile) || isJunctionTile(tile)) {
      s.setTileComputed(tile.id, computeTrackTile(tile, null, null, null));
    }
    if (tile.type === 'friend') {
      s.initiateDynamicObject(tile.id, tile.position);
    }
    s.updateCurrentLevel({ tiles: [...level.tiles, tile] });
  },
  deleteTile: (tileId: string) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    const tile = level.tiles.find((t) => t.id === tileId);
    const tilesComputed = { ...s.tilesComputed };
    delete tilesComputed[tileId];
    s.setTilesComputed(tilesComputed);
    s.updateCurrentLevel({
      tiles: level.tiles
        .filter((tile) => tile.id !== tileId)
        .map((tile) => {
          {
            if (tile.parentId === tileId) {
              return {
                ...tile,
                position: [
                  tile.position[0] + tile.position[0],
                  tile.position[1] + tile.position[1],
                  tile.position[2] + tile.position[2],
                ],
                parentId: null,
              };
            }
            return tile;
          }
        }),
    });
  },
  groupTile: (tileId, parentId) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    const parent = level.tiles.find(
      (tile) => tile.id === parentId,
    ) as GroupTile;
    const tiles = level.tiles.map((tile) => {
      if (tile.id === tileId) {
        // add the child to the parent, but to keep the child's world position,
        // subtract the group's position. A tile's position is in parent space!
        return {
          ...tile,
          parentId,
          position: [
            tile.position[0] - parent.position[0],
            tile.position[1] - parent.position[1],
            tile.position[2] - parent.position[2],
          ],
        } as Tile;
      }
      return tile;
    });
    s.updateCurrentLevel({ tiles });
  },
  ungroupTile: (tileId) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    const tile = level.tiles.find((t) => t.id === tileId)!;
    const group = level.tiles.find((t) => t.id === tile.parentId) as GroupTile;
    const tiles = level.tiles.map((tile) => {
      if (tile.id === tileId) {
        return {
          ...tile,
          parentId: null,
          position: [
            tile.position[0] + group.position[0],
            tile.position[1] + group.position[1],
            tile.position[2] + group.position[2],
          ],
        } as Tile;
      }
      return tile;
    });
    s.updateCurrentLevel({ tiles });
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
  setTileAction: (tileId, actionIdx, action) => {
    const s = get();
    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    const t = level.tiles.find((tile) => tile.id === tileId) as ButtonTile;
    const updated: ButtonTile = {
      ...t,
      actions: t.actions.map((a, i) => (i === actionIdx ? action : a)),
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
      s.setTileComputed(
        updated.id,
        computeTrackTile(
          updated,
          s.transforms[updated.id],
          level.tiles.find((t): t is GroupTile => t.id === updated.parentId!) ||
            null,
          s.transforms[updated.parentId!] || null,
        ),
      );
    } else if (updated.type === 'friend') {
      if ('position' in update) {
        s.setPosition(tileId, update.position as [number, number, number]);
      }
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

  tilesComputed: {},
  setTileComputed: (tileId, computed) =>
    set((state) => ({
      tilesComputed: {
        ...state.tilesComputed,
        [tileId]: computed,
      },
    })),
  setTilesComputed: (tilesComputed) => set({ tilesComputed }),

  dynamicObjects: {
    [PLAYER_ID]: consDynamicState(),
  },
  semiDynamicObjects: {
    [PLAYER_ID]: consSemiDynamicState(),
  },
  initiateDynamicObject: (objectId, position) =>
    set((state) => {
      return {
        dynamicObjects: {
          ...state.dynamicObjects,
          [objectId]: { ...consDynamicState(), position },
        },
        semiDynamicObjects: {
          ...state.semiDynamicObjects,
          [objectId]: consSemiDynamicState(),
        },
      };
    }),
  setMomentum: (objectId, momentum) =>
    set((state) => ({
      semiDynamicObjects: {
        ...state.semiDynamicObjects,
        [objectId]: {
          ...state.semiDynamicObjects[objectId],
          momentum,
        },
      },
    })),
  setCurveProgress: (objectId, curveProgress) =>
    set((state) => ({
      dynamicObjects: {
        ...state.dynamicObjects,
        [objectId]: {
          ...state.dynamicObjects[objectId],
          curveProgress,
        },
      },
    })),
  setCurrentTileId: (objectId, currentTileId) =>
    set((state) => ({
      semiDynamicObjects: {
        ...state.semiDynamicObjects,
        [objectId]: {
          ...state.semiDynamicObjects[objectId],
          currentTileId,
        },
      },
    })),
  setCurrentCurveIndex: (objectId, currentCurveIndex) =>
    set((state) => ({
      semiDynamicObjects: {
        ...state.semiDynamicObjects,
        [objectId]: {
          ...state.semiDynamicObjects[objectId],
          currentCurveIndex,
        },
      },
    })),
  setNextConnection: (objectId, nextConnection) =>
    set((state) => ({
      semiDynamicObjects: {
        ...state.semiDynamicObjects,
        [objectId]: {
          ...state.semiDynamicObjects[objectId],
          nextConnection,
        },
      },
    })),
  setPosition: (objectId, position) =>
    set((state) => ({
      dynamicObjects: {
        ...state.dynamicObjects,
        [objectId]: {
          ...state.dynamicObjects[objectId],
          position,
        },
      },
    })),
  setEnteredFrom: (objectId, enteredFrom) =>
    set((state) => ({
      semiDynamicObjects: {
        ...state.semiDynamicObjects,
        [objectId]: {
          ...state.semiDynamicObjects[objectId],
          enteredFrom,
        },
      },
    })),

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
    if (action.type === 'rotation' || action.type === 'translation') {
      action.targetTiles.forEach((targetId) => {
        const target = level.tiles.find((t) => t.id === targetId);
        if (!target) {
          console.error('Bad target!', { action, targetId });
          return;
        }
        let transform = s.transforms[targetId] || {};

        if (action.type === 'rotation') {
          const start = s.transforms[targetId]?.rotation ||
            target?.rotation || [0, 0, 0];
          const { axis, degrees } = action;
          const rad = deg2Rad(degrees);
          const rotation = [
            start[0] + (axis === 'x' ? rad : 0),
            start[1] + (axis === 'y' ? rad : 0),
            start[2] + (axis === 'z' ? rad : 0),
          ] as [number, number, number];
          transform = {
            ...transform,
            rotation,
          };
        } else if (action.type === 'translation') {
          const start = s.transforms[targetId]?.position ||
            target?.position || [0, 0, 0];
          const offset = action.offset;
          const position = [
            start[0] + parseFloat(offset[0]),
            start[1] + parseFloat(offset[1]),
            start[2] + parseFloat(offset[2]),
          ] as [number, number, number];
          transform = {
            ...transform,
            position,
          };
        }

        let updatedComputed = s.tilesComputed;

        if (isRailTile(target) || isJunctionTile(target)) {
          updatedComputed = {
            ...s.tilesComputed,
            [targetId]: computeTrackTile(
              target as RailTile,
              transform,
              // Button targeting a tile in a group is not currently supported
              null,
              null,
            ),
          };
        } else if (target.type === 'group') {
          const tilesToUpdate = level.tiles.filter(
            (t) => t.parentId === targetId,
          );
          const groupTile = target as GroupTile;
          updatedComputed = tilesToUpdate.reduce(
            (acc, tile) => ({
              ...acc,
              ...(isRailTile(tile) || isJunctionTile(tile)
                ? {
                    [tile.id]: computeTrackTile(
                      tile as RailTile,
                      // original tile transform, if any, probably shouldn't be any since it's in a group!
                      s.transforms[tile.id],
                      groupTile,
                      // The updated group transform
                      transform,
                    ),
                  }
                : null),
            }),
            s.tilesComputed,
          );
        }
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
        if (transform && transform[key]) {
          delete transform[key];
        }
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

  victory: false,
  setVictory: (victory) => set({ victory }),

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

  bonkBackTo: null,
  setBonkBackTo: (bonkBackTo) => set({ bonkBackTo }),
  clearBonkBackTo: () => set({ bonkBackTo: null }),

  resetLevel: () => {
    const s = get();
    if (!s.currentLevelId) {
      return {};
    }

    const level = s.levels.find((l) => l.id === s.currentLevelId)!;
    const tilesComputed = level.tiles.reduce<Record<string, TileComputed>>(
      (acc, tile) => {
        const parentTile =
          level.tiles.find((t): t is GroupTile => t.id === tile.parentId) ||
          null;
        return isRailTile(tile) || isJunctionTile(tile)
          ? {
              ...acc,
              [tile.id]: computeTrackTile(tile, null, parentTile, null),
            }
          : acc;
      },
      {},
    );

    const startingTile = level.tiles.find(
      (t) => t.id === level.startingTileId,
    ) as TrackTile | undefined;
    console.log('Game reset! Starting on', { startingTile });

    const friends = level.tiles.filter((t) => t.type === 'friend');

    set({
      semiDynamicObjects: {
        [PLAYER_ID]: {
          ...consSemiDynamicState(),
          enteredFrom: startingTile?.type === 't' ? -1 : 0,
          // TODO: Need a starting connection too!
          nextConnection: -1,
          currentTileId: startingTile?.id || null,
        },
        ...friends.reduce((acc, t) => {
          const tile = level.tiles.find(
            (tt): tt is TrackTile => tt.id === t.startingTileId,
          );
          return {
            ...acc,
            [t.id]: {
              ...consSemiDynamicState(),
              momentum: parseFloat(t.speed) * t.startingDirection,
              enteredFrom: tile?.type === 't' ? -1 : 0,
              // TODO: Need a starting connection too!
              nextConnection: -1,
              currentTileId: tile?.id || null,
            },
          };
        }, {}),
      },
      dynamicObjects: {
        [PLAYER_ID]: {
          ...consDynamicState(),
          curveProgress:
            startingTile?.type === 'cap' || startingTile?.type === 't'
              ? 1
              : 0.5,
        },
        ...friends.reduce((acc, t) => {
          const tile = level.tiles.find(
            (tt): tt is TrackTile => tt.id === t.startingTileId,
          );
          return {
            ...acc,
            [t.id]: {
              ...consDynamicState(),
              curveProgress:
                tile?.type === 'cap' || tile?.type === 't' ? 1 : 0.5,
            },
          };
        }, {}),
      },
      transforms: {},
      debugPoints: [],
      bonkBackTo: null,
      collectedItems: new Set(),
      gateStates: {},
      tilesComputed,
      victory: false,
    });
    s.autoSnap(tilesComputed);
  },
}));

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
