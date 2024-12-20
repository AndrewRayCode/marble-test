import { ButtonTile, useGameStore } from '@/store/gameStore';

const Toggle = ({ tile, opacity }: { tile: ButtonTile; opacity?: number }) => {
  const { position, rotation } = tile;

  const booleanSwitches = useGameStore((s) => s.booleanSwitches);
  const color = booleanSwitches[tile.id] ? 'green' : 'red';
  const matOpacity = opacity || 1;

  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.1, 32]} />
        <meshStandardMaterial
          opacity={matOpacity}
          transparent={matOpacity < 1}
          color={color}
          roughness={0.0}
          metalness={0.5}
          emissive={color}
        />
      </mesh>
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
        <meshStandardMaterial
          opacity={matOpacity}
          transparent={matOpacity < 1}
          color="yellow"
          roughness={0.1}
          metalness={0.5}
        />
      </mesh>
    </group>
  );
};

export default Toggle;
