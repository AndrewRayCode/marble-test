import { GroupTile, useGameStore } from '@/store/gameStore';
import { useSpring, a } from '@react-spring/three';
import Straightaway from './Straightaway';
import QuarterTurn from './QuarterTurn';
import Junction from './Junction';
import Toggle from './Toggle';
import Cap from './Cap';
import Sphere from './Sphere';
import Coin from './Coin';
import Gate from './Gate';
import Box from './Box';
import { useMemo } from 'react';

const Group = ({ tile, opacity }: { tile: GroupTile; opacity?: number }) => {
  const {
    position: meshPosition,
    rotation: meshRotation,
    scale: groupScale,
  } = tile;
  const collectedItems = useGameStore((state) => state.collectedItems);
  const transform = useGameStore((state) => state.transforms[tile.id]);
  const levels = useGameStore((state) => state.levels);
  const currentLevelId = useGameStore((state) => state.currentLevelId);
  const isEditing = useGameStore((state) => state.isEditing);
  const matOpacity = opacity || 1;

  const level = useMemo(() => {
    if (currentLevelId) {
      return levels.find((l) => l.id === currentLevelId);
    }
  }, [levels, currentLevelId]);

  const { position, rotation } = useSpring({
    position: transform?.position || meshPosition,
    rotation: transform?.rotation || meshRotation,
    config: {
      mass: 1,
      tension: 170,
      friction: 26,
    },
  });

  const children = level!.tiles.filter((t) => t.parentId === tile.id);

  return (
    <a.group
      position={position}
      rotation={rotation as unknown as [number, number, number]}
      scale={groupScale}
    >
      {isEditing && (
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color={0x000000} wireframe />
        </mesh>
      )}
      {children.map((tile) => {
        if (tile.type === 'straight') {
          return <Straightaway key={tile.id} tile={tile} />;
        } else if (tile.type === 'quarter') {
          return <QuarterTurn key={tile.id} tile={tile} />;
        } else if (tile.type === 't') {
          return <Junction key={tile.id} tile={tile} />;
        } else if (tile.type === 'button') {
          return <Toggle key={tile.id} tile={tile} />;
        } else if (tile.type === 'cap') {
          return <Cap key={tile.id} tile={tile} />;
        } else if (tile.type === 'box') {
          return <Box key={tile.id} tile={tile} />;
        } else if (tile.type === 'sphere') {
          return <Sphere key={tile.id} tile={tile} />;
        } else if (tile.type === 'coin') {
          return (
            <Coin
              key={tile.id}
              tile={tile}
              visible={!collectedItems.has(tile.id)}
            />
          );
        } else if (tile.type === 'gate') {
          return <Gate key={tile.id} tile={tile} />;
        }
      })}
    </a.group>
  );
};

export default Group;
