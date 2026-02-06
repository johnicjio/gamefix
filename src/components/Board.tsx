import { useMemo } from 'react';
import * as THREE from 'three';

const COLORS = {
  red: '#FF4747',
  green: '#47FF47',
  yellow: '#FFD647',
  blue: '#4775FF',
  white: '#FFFFFF',
  safe: '#FFD700'
};

export function Board() {
  // Calculate positions for the cross-shaped board
  const cells = useMemo(() => {
    const cellSize = 1.2;
    const positions: Array<{ pos: [number, number, number]; color: string; isSafe?: boolean }> = [];

    // Main track cells (52 cells around the board)
    const trackOrder = [
      // Bottom side (Red start at 0)
      ...Array.from({ length: 6 }, (_, i) => ({ x: -3 + i, z: 6, color: i === 1 ? COLORS.safe : COLORS.white })),
      // Left bottom corner
      { x: 3, z: 5, color: COLORS.white },
      { x: 3, z: 4, color: COLORS.white },
      { x: 3, z: 3, color: COLORS.white },
      // Left side (Green start at 13)
      ...Array.from({ length: 6 }, (_, i) => ({ x: 4, z: 3 - i, color: i === 1 ? COLORS.safe : COLORS.white })),
      // Top left corner
      { x: 3, z: -3, color: COLORS.white },
      { x: 2, z: -3, color: COLORS.white },
      { x: 1, z: -3, color: COLORS.white },
      // Top side (Yellow start at 26)
      ...Array.from({ length: 6 }, (_, i) => ({ x: -i, z: -4, color: i === 1 ? COLORS.safe : COLORS.white })),
      // Top right corner
      { x: -6, z: -3, color: COLORS.white },
      { x: -6, z: -2, color: COLORS.white },
      { x: -6, z: -1, color: COLORS.white },
      // Right side (Blue start at 39)
      ...Array.from({ length: 6 }, (_, i) => ({ x: -7, z: i, color: i === 1 ? COLORS.safe : COLORS.white })),
      // Bottom right corner
      { x: -6, z: 6, color: COLORS.white },
      { x: -5, z: 6, color: COLORS.white },
      { x: -4, z: 6, color: COLORS.white },
    ];

    trackOrder.forEach((cell, i) => {
      positions.push({
        pos: [cell.x * cellSize, 0.1, cell.z * cellSize],
        color: cell.color,
        isSafe: cell.color === COLORS.safe
      });
    });

    return positions;
  }, []);

  // Home triangles for each color
  const homeTriangles = useMemo(() => [
    { pos: [-3, 0.05, 8] as [number, number, number], color: COLORS.red, rotation: 0 },
    { pos: [6, 0.05, 3] as [number, number, number], color: COLORS.green, rotation: Math.PI / 2 },
    { pos: [0, 0.05, -5] as [number, number, number], color: COLORS.yellow, rotation: Math.PI },
    { pos: [-9, 0.05, 0] as [number, number, number], color: COLORS.blue, rotation: -Math.PI / 2 },
  ], []);

  return (
    <group>
      {/* Base platform */}
      <mesh receiveShadow position={[0, -0.5, 0]}>
        <boxGeometry args={[20, 0.5, 20]} />
        <meshStandardMaterial color="#2c3e50" />
      </mesh>

      {/* Center finish area */}
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[2, 2, 0.3, 32]} />
        <meshStandardMaterial color="#FFD700" metalness={0.3} roughness={0.2} />
      </mesh>

      {/* Track cells */}
      {cells.map((cell, i) => (
        <mesh key={i} position={cell.pos} receiveShadow castShadow>
          <boxGeometry args={[1, cell.isSafe ? 0.15 : 0.1, 1]} />
          <meshStandardMaterial
            color={cell.color}
            roughness={0.3}
            metalness={0.1}
          />
        </mesh>
      ))}

      {/* Home triangles (starting yards) */}
      {homeTriangles.map((triangle, i) => (
        <group key={i} position={triangle.pos} rotation={[0, triangle.rotation, 0]}>
          <mesh receiveShadow>
            <boxGeometry args={[4, 0.1, 4]} />
            <meshStandardMaterial
              color={triangle.color}
              roughness={0.2}
              metalness={0.1}
              opacity={0.8}
              transparent
            />
          </mesh>
          {/* Yard markers */}
          {[[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]].map((pos, j) => (
            <mesh key={j} position={[pos[0], 0.12, pos[1]]}>
              <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
              <meshStandardMaterial
                color={triangle.color}
                roughness={0.1}
                metalness={0.2}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Home stretch paths */}
      {[
        { start: [0, 0.12, 5], color: COLORS.red, rotation: 0 },
        { start: [5, 0.12, 0], color: COLORS.green, rotation: Math.PI / 2 },
        { start: [0, 0.12, -5], color: COLORS.yellow, rotation: Math.PI },
        { start: [-5, 0.12, 0], color: COLORS.blue, rotation: -Math.PI / 2 },
      ].map((path, i) => (
        <group key={i} position={path.start as [number, number, number]} rotation={[0, path.rotation, 0]}>
          {Array.from({ length: 5 }).map((_, j) => (
            <mesh key={j} position={[0, 0, -j * 1.2]}>
              <boxGeometry args={[0.8, 0.12, 0.8]} />
              <meshStandardMaterial color={path.color} roughness={0.2} metalness={0.1} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}