'use client';

import {
  ActionAxis,
  ActionTargetType,
  ActionType,
  NumTrip,
  RailTile,
  Side,
  StrTrip,
  useGameStore,
} from '@/store/gameStore';

import cx from 'classnames';

import styles from './editor.module.css';

const ArrayOfIdsEditor = ({
  ids,
  onChange,
}: {
  ids: string[];
  onChange: (ids: string[]) => void;
}) => {
  const base = ids.length === 0 ? [''] : ids.concat('');
  return (
    <div>
      {base.map((id, i) => {
        return (
          <div key={i} className="grid gap-2 grid-cols-[1fr_max-content]">
            <div>
              <input
                value={id}
                type="text"
                placeholder="Target Tile ID"
                className={cx(styles.input, 'mb-2 w-full')}
                onChange={(e) => {
                  onChange(
                    base
                      .map((id, j) => (i === j ? e.target.value : id))
                      .slice(
                        // There aren't an yet, so add in our default concatted
                        ...(ids.length === 0
                          ? [0, Infinity]
                          : // We are editing the last entry, so don't remove the
                            // last one
                            i === base.length - 1
                            ? [0, Infinity]
                            : // We are editing the middle of an existing array,
                              // so remove the placeholder at the end
                              [0, -1]),
                      ),
                  );
                }}
              />
            </div>
            <div>
              {ids.length > 0 && i !== base.length - 1 ? (
                <button
                  onClick={() => {
                    onChange(
                      base
                        .filter((_, j) => i !== j)
                        .slice(...(ids.length === 0 ? [0, Infinity] : [0, -1])),
                    );
                  }}
                >
                  x
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const TileEditor = ({ selectedTileId }: { selectedTileId: string }) => {
  const currentLevelId = useGameStore((state) => state.currentLevelId);
  const levels = useGameStore((state) => state.levels);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);

  const level = levels.find((l) => l.id === currentLevelId);
  const selectedTile = level?.tiles?.find((tile) => tile.id === selectedTileId);
  const updateTileAndRecompute = useGameStore(
    (state) => state.updateTileAndRecompute,
  );
  const updateTileAction = useGameStore((state) => state.updateTileAction);

  if (!selectedTile) {
    return <div>Tile &quot;{selectedTileId}&quot; not found!</div>;
  }

  return (
    <div>
      <div className="mb-3">
        <label className="text-slate-400">Id</label> {selectedTile.id}
      </div>
      <div className="mb-3">
        <label className="text-slate-400">Type</label> {selectedTile.type}
      </div>
      {selectedTile.type === 'button' && (
        <div>
          <div className="mb-3">
            <label className="text-slate-400">Action Trigger</label>
            <select
              className={cx(styles.input, 'mb-2 w-full')}
              value={selectedTile.actionType}
              onChange={(e) => {
                updateTileAndRecompute(selectedTileId, {
                  actionType: e.target.value as ActionType,
                });
              }}
            >
              <option value="toggle">Toggle</option>
              <option value="click">Click</option>
              <option value="timed">Timed</option>
              <option value="hold">Hold</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="text-slate-400">Action Type</label>
            <select
              className={cx(styles.input, 'mb-2 w-full')}
              value={selectedTile.action?.type}
              onChange={(e) => {
                updateTileAction(selectedTileId, {
                  type: e.target.value as ActionTargetType,
                });
              }}
            >
              <option value="rotation">Rotation</option>
            </select>
          </div>
          {selectedTile.action?.type === 'rotation' ||
          !selectedTile.action?.type ? (
            <div className="mb-3 grid grid-cols-2 gap-2">
              <div>
                <label className="text-slate-400">Axis</label>
                <select
                  className={cx(styles.input, 'mb-2 w-full')}
                  value={selectedTile.action?.axis}
                  onChange={(e) => {
                    updateTileAction(selectedTileId, {
                      axis: e.target.value as ActionAxis,
                    });
                  }}
                >
                  <option value="x">X</option>
                  <option value="y">Y</option>
                  <option value="z">Z</option>
                </select>
              </div>
              <div>
                <label className="text-slate-400">Degrees</label>
                <input
                  className={cx(styles.input, 'mb-2 w-full')}
                  value={selectedTile.action?.degrees}
                  onChange={(e) => {
                    updateTileAction(selectedTileId, {
                      degrees: parseInt(e.target.value),
                    });
                  }}
                  type="number"
                />
              </div>
            </div>
          ) : null}
          <div className="mb-3">
            <label className="text-slate-400">Action Targets</label>
            <ArrayOfIdsEditor
              ids={selectedTile.action?.targetTiles || []}
              onChange={(targetTiles) => {
                updateTileAction(selectedTileId, {
                  targetTiles,
                });
              }}
            />
          </div>
        </div>
      )}
      {'connections' in selectedTile && (
        <div>
          <div className="mb-3">
            <label className="mb-1 block text-slate-400" htmlFor="st">
              Starting Tile?
            </label>
            <input
              id="st"
              type="checkbox"
              checked={level?.startingTileId === selectedTile.id}
              onChange={(e) => {
                if (level?.startingTileId !== selectedTile.id) {
                  updateCurrentLevel({
                    startingTileId: selectedTile.id,
                  });
                }
              }}
            />
          </div>
          <div className="mb-3">
            <label className="mb-1 block text-slate-400">Sides</label>
            <select
              className={cx(styles.input, 'mb-2 w-full')}
              value={selectedTile.showSides}
              onChange={(e) => {
                updateTileAndRecompute(selectedTileId, {
                  showSides: e.target.value as Side,
                });
              }}
            >
              <option value="all">All</option>
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
              <option value="front">Front</option>
              <option value="back">Back</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-slate-300">Connections</label>
            <div
              className={cx(`grid gap-2`, {
                'grid-cols-2': selectedTile.connections.length === 2,
                'grid-cols-3': selectedTile.connections.length === 3,
              })}
            >
              {selectedTile.connections.map((connection, i) => {
                return (
                  <div key={i}>
                    <label className="mb-1 block text-xs ">
                      Connection {i}
                    </label>
                    <input
                      className={cx(styles.input, 'mb-2 w-full')}
                      value={connection!}
                      onChange={(e) => {
                        updateTileAndRecompute(selectedTileId, {
                          connections: selectedTile.connections.map((c, j) =>
                            i === j ? e.target.value : c,
                          ) as StrTrip,
                        });
                      }}
                      type="text"
                    />
                    <label className="mb-1 block text-xs">Other Entrance</label>
                    <select
                      className={cx(styles.input, 'mb-2 w-full')}
                      value={selectedTile.entrances[i]!}
                      onChange={(e) => {
                        updateTileAndRecompute(selectedTileId, {
                          entrances: selectedTile.entrances.map((c, j) =>
                            i === j ? parseInt(e.target.value) : c,
                          ) as NumTrip,
                        });
                      }}
                    >
                      {level?.tiles
                        ?.find(
                          (tile): tile is RailTile => tile.id === connection,
                        )
                        ?.entrances.map((_, i) => {
                          return (
                            <option key={i} value={i}>
                              {i}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TileEditor;
