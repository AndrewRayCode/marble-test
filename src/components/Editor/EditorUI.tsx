'use client';

import { useGameStore, useKeyPress } from '@/store/gameStore';

import cx from 'classnames';

import styles from './editor.module.css';
import TileEditor from './TileEditor';

export const EditorUI = ({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) => {
  const currentLevelId = useGameStore((state) => state.currentLevelId);
  const levels = useGameStore((state) => state.levels);
  const hoverTileId = useGameStore((state) => state.hoverTileId);
  const selectedTileId = useGameStore((state) => state.selectedTileId);
  const createLevel = useGameStore((state) => state.createLevel);
  const saveLevel = useGameStore((state) => state.saveLevel);
  const deleteLevel = useGameStore((state) => state.deleteLevel);
  const updateCurrentLevel = useGameStore((state) => state.updateCurrentLevel);
  const setCurrentLevelId = useGameStore((state) => state.setCurrentLevelId);

  const level = levels.find((l) => l.id === currentLevelId);
  const selectedTile = level?.tiles?.find((tile) => tile.id === selectedTileId);
  const createType = useGameStore((state) => state.createType);
  const setCreateType = useGameStore((state) => state.setCreateType);
  const showCursor = useGameStore((state) => state.showCursor);
  const setShowCursor = useGameStore((state) => state.setShowCursor);

  useKeyPress('j', () => {
    setCreateType('t');
  });
  useKeyPress('m', () => {
    setCreateType('straight');
  });
  useKeyPress('q', () => {
    setCreateType('quarter');
  });
  useKeyPress('b', () => {
    setCreateType('button');
  });
  useKeyPress('c', () => {
    setCreateType('cap');
  });

  return (
    <div
      className={cx('h-screen w-full', {
        'cursor-pointer': hoverTileId !== null,
      })}
    >
      {children}

      <div
        className={cx(
          styles.bottomToolbar,
          'bg-slate-900 text-sm flex gap-2 flex-row',
        )}
        style={{
          display: enabled ? '' : 'none',
        }}
      >
        <div
          className={cx(
            styles.toolbarItem,
            styles.keyboard,
            'bg-gray-700 block',
          )}
        >
          <div className="key">g</div> <div>Rotate Grid</div>
        </div>
        {selectedTileId && (
          <div
            className={cx(styles.toolbarItem, styles.keyboard, 'bg-gray-700')}
          >
            <div className="key">rts</div> <div>Transform mode</div>
          </div>
        )}
        <div
          className={cx(styles.toolbarButton, styles.keyboard, {
            [styles.selected]: showCursor,
          })}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setShowCursor(!showCursor);
          }}
        >
          <div className="key">a</div> <div>Add</div>
        </div>
        {showCursor && (
          <div className="flex gap-2 flex-wrap">
            <div
              className={cx(styles.toolbarButton, styles.keyboard, {
                [styles.selected]: createType === 't',
              })}
              key="jnct"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCreateType('t');
              }}
            >
              <div className="key">j</div> <div>Junction</div>
            </div>
            <div
              className={cx(styles.toolbarButton, styles.keyboard, {
                [styles.selected]: createType === 'straight',
              })}
              key="str8"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCreateType('straight');
              }}
            >
              <div className="key">g</div> <div>Straight</div>
            </div>
            <div
              className={cx(styles.toolbarButton, styles.keyboard, {
                [styles.selected]: createType === 'quarter',
              })}
              key="qrtr"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCreateType('quarter');
              }}
            >
              <div className="key">q</div> <div>Turn</div>
            </div>
            <div
              className={cx(styles.toolbarButton, styles.keyboard, {
                [styles.selected]: createType === 'button',
              })}
              key="btn"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCreateType('button');
              }}
            >
              <div className="key">b</div> <div>Button</div>
            </div>
            <div
              className={cx(styles.toolbarButton, {
                [styles.selected]: createType === 'group',
              })}
              key="grp"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCreateType('group');
              }}
            >
              <div>Group</div>
            </div>
            <div
              className={cx(styles.toolbarButton, {
                [styles.selected]: createType === 'box',
              })}
              key="box"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCreateType('box');
              }}
            >
              <div>Box</div>
            </div>
            <div
              className={cx(styles.toolbarButton, {
                [styles.selected]: createType === 'sphere',
              })}
              key="sphr"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCreateType('sphere');
              }}
            >
              <div>Sphere</div>
            </div>
            <div
              className={cx(styles.toolbarButton, {
                [styles.selected]: createType === 'coin',
              })}
              key="coin"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCreateType('coin');
              }}
            >
              <div>Coin</div>
            </div>
            <div
              className={cx(styles.toolbarButton, {
                [styles.selected]: createType === 'gate',
              })}
              key="gat"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCreateType('gate');
              }}
            >
              <div>Gate</div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div
        className={cx(styles.sidebar, 'bg-slate-900')}
        style={{
          display: enabled ? '' : 'none',
        }}
      >
        <div className="mb-3 border-solid border-2 p-2 rounded-lg border-slate-600">
          <label className="mb-1 block">Select Level</label>
          <div className="grid grid-cols-[1fr_max-content] grid-cols-2 gap-2">
            <div>
              <select
                className={cx(styles.input, 'mb-2 w-full')}
                value={currentLevelId || ''}
                onChange={(e) => {
                  setCurrentLevelId(e.target.value);
                }}
              >
                {levels.map((level) => {
                  return (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <div
                className={cx(styles.toolbarButton, 'block')}
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  createLevel({
                    name: 'New Level',
                    description: 'New Level',
                    tiles: [],
                    startingTileId: '',
                  });
                }}
              >
                New Level
              </div>
            </div>
          </div>
        </div>
        <div className="mb-3 border-solid border-2 p-2 rounded-lg border-slate-600">
          <label className="mb-1 block">Level Name</label>
          <div className="grid grid-cols-[1fr_max-content_max-content] grid-cols-2 gap-2">
            <div>
              <input
                type="text"
                className={cx(styles.input, 'mb-2 w-full')}
                value={level?.name || ''}
                onChange={(e) => {
                  updateCurrentLevel({
                    name: e.target.value,
                  });
                }}
              />
            </div>
            <div>
              <button
                className={cx(styles.toolbarButton, 'block')}
                disabled={!level}
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  await saveLevel(level!);
                }}
              >
                Save
              </button>
            </div>
            <div>
              <button
                className={cx(
                  styles.toolbarButton,
                  styles.destructive,
                  'block',
                )}
                disabled={!level || !level.id}
                onClick={async (e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  if (confirm('Are you sure you want to delete this level?')) {
                    await deleteLevel(level!.id!);
                  }
                }}
              >
                x
              </button>
            </div>
          </div>
        </div>

        {selectedTile && selectedTileId && (
          <div>
            <label className="mb-3 block">
              Selected Tile ({selectedTile.type})
            </label>
            <TileEditor selectedTileId={selectedTileId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorUI;
