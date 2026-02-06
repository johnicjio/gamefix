import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, type Piece, type PlayerColor } from '../store';

const COLORS = {
  red: '#FF4747',
  green: '#47FF47',
  yellow: '#FFD647',
  blue: '#4775FF'
};

// Get 3D position for a piece based on its position/cellIndex
function getPiecePosition(piece: Piece): [number, number, number] {
  const cellSize = 1.2;
  
  // In yard
  if (piece.position === -1) {
    const yardPositions = {
      red: [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]],
      green: [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]],
      yellow: [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]],
      blue: [[-0.8, 0.8], [0.8, 0.8], [-0.8, -0.8], [0.8, -0.8]]
    };
    
    const yardBase = {
      red: [-3, 0, 8],
      green: [6, 0, 3],
      yellow: [0, 0, -5],
      blue: [-9, 0, 0]
    };
    
    const pieceIndex = parseInt(piece.id.split('-')[1]);
    const [px, pz] = yardPositions[piece.color][pieceIndex];
    const base = yardBase[piece.color];
    
    return [base[0] + px, 0.5, base[2] + pz];
  }
  
  // Finished
  if (piece.position === 58) {
    return [0, 0.5, 0];
  }
  
  // Home stretch (52-57)
  if (piece.position >= 52) {
    const stretchIndex = piece.position - 52;
    const stretches = {
      red: { start: [0, 5], rotation: 0 },
      green: { start: [5, 0], rotation: Math.PI / 2 },
      yellow: { start: [0, -5], rotation: Math.PI },
      blue: { start: [-5, 0], rotation: -Math.PI / 2 }
    };
    
    const stretch = stretches[piece.color];
    const angle = stretch.rotation;
    const dist = stretchIndex * 1.2;
    const x = stretch.start[0] - Math.sin(angle) * dist;
    const z = stretch.start[1] - Math.cos(angle) * dist;
    
    return [x, 0.5, z];
  }
  
  // Main track (0-51)
  const trackPositions = [
    // Bottom (red start)
    ...Array.from({ length: 6 }, (_, i) => [-3 + i, 6]),
    [3, 5], [3, 4], [3, 3],
    // Left (green start at 13)
    ...Array.from({ length: 6 }, (_, i) => [4, 3 - i]),
    [3, -3], [2, -3], [1, -3],
    // Top (yellow start at 26)
    ...Array.from({ length: 6 }, (_, i) => [-i, -4]),
    [-6, -3], [-6, -2], [-6, -1],
    // Right (blue start at 39)
    ...Array.from({ length: 6 }, (_, i) => [-7, i]),
    [-6, 6], [-5, 6], [-4, 6]
  ];
  
  const [x, z] = trackPositions[piece.position] || [0, 0];
  return [x * cellSize, 0.5, z * cellSize];
}

function PieceComponent({ piece }: { piece: Piece }) {
  const meshRef = useRef<THREE.Group>(null);
  const targetPos = useRef(new THREE.Vector3());
  const currentPos = useRef(new THREE.Vector3());
  const animating = useRef(false);
  const animationTime = useRef(0);
  const startPos = useRef(new THREE.Vector3());
  
  useEffect(() => {
    const [x, y, z] = getPiecePosition(piece);
    const newTarget = new THREE.Vector3(x, y, z);
    
    if (meshRef.current) {
      if (!currentPos.current.x && !currentPos.current.z) {
        // Initial position
        meshRef.current.position.copy(newTarget);
        currentPos.current.copy(newTarget);
        targetPos.current.copy(newTarget);
      } else if (!newTarget.equals(targetPos.current)) {
        // Start animation
        startPos.current.copy(currentPos.current);
        targetPos.current.copy(newTarget);
        animating.current = true;
        animationTime.current = 0;
      }
    }
  }, [piece.position, piece.cellIndex]);
  
  useFrame((_, delta) => {
    if (animating.current && meshRef.current) {
      animationTime.current += delta;
      const duration = 0.3; // 300ms
      const t = Math.min(animationTime.current / duration, 1);
      
      // Linear interpolation for x and z
      const x = THREE.MathUtils.lerp(startPos.current.x, targetPos.current.x, t);
      const z = THREE.MathUtils.lerp(startPos.current.z, targetPos.current.z, t);
      
      // Parabolic jump for y
      const baseY = 0.5;
      const jumpHeight = 1.5;
      const y = baseY + Math.sin(t * Math.PI) * jumpHeight;
      
      meshRef.current.position.set(x, y, z);
      currentPos.current.set(x, baseY, z);
      
      if (t >= 1) {
        animating.current = false;
        meshRef.current.position.copy(targetPos.current);
        currentPos.current.copy(targetPos.current);
      }
    }
  });
  
  return (
    <group ref={meshRef}>
      {/* Base cylinder */}
      <mesh castShadow>
        <cylinderGeometry args={[0.25, 0.3, 0.4, 16]} />
        <meshStandardMaterial
          color={COLORS[piece.color]}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
      {/* Top sphere */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color={COLORS[piece.color]}
          roughness={0.1}
          metalness={0.1}
        />
      </mesh>
    </group>
  );
}

export function Pieces() {
  const { pieces } = useGameStore();
  
  return (
    <group>
      {pieces.map((piece) => (
        <PieceComponent key={piece.id} piece={piece} />
      ))}
    </group>
  );
}