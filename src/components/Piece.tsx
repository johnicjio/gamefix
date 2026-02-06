import { motion, useAnimate } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Piece as PieceType, useGameStore } from '../store/GameStore';
import { getCellCoordinates, getHomeStretchCoordinates, getYardPosition } from './Board';
import { useSound } from '../hooks/useSound';

interface PieceProps {
  piece: PieceType;
  onClick: () => void;
  isSelectable: boolean;
}

// Get position for rendering
function getPiecePosition(piece: PieceType): { x: number; y: number } {
  // In yard
  if (piece.position === -1) {
    const pieceIndex = parseInt(piece.id.split('-')[1]);
    return getYardPosition(piece.color, pieceIndex);
  }
  
  // Finished
  if (piece.position === 100) {
    return { x: 300, y: 300 };
  }
  
  // Home stretch (52-57)
  if (piece.position >= 52) {
    return getHomeStretchCoordinates(piece.position, piece.color);
  }
  
  // Main track (0-51)
  return getCellCoordinates(piece.position);
}

// Calculate path for multi-cell animation
function calculatePath(start: number, end: number, color: string): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [];
  
  // If leaving yard
  if (start === -1) {
    const startPos = { red: 0, green: 13, yellow: 26, blue: 39 }[color];
    path.push(getCellCoordinates(startPos));
    return path;
  }
  
  // If in home stretch
  if (start >= 52 || end >= 52) {
    for (let i = start + 1; i <= end; i++) {
      if (i >= 52) {
        path.push(getHomeStretchCoordinates(i, color));
      } else {
        path.push(getCellCoordinates(i));
      }
    }
    return path;
  }
  
  // On main track
  let current = start;
  const distance = end - start;
  
  for (let i = 0; i < distance; i++) {
    current = (current + 1) % 52;
    path.push(getCellCoordinates(current));
  }
  
  return path;
}

export default function Piece({ piece, onClick, isSelectable }: PieceProps) {
  const [scope, animate] = useAnimate();
  const [prevPosition, setPrevPosition] = useState(piece.position);
  const slideSound = useSound('slide');
  
  const colors = {
    red: '#FF4757',
    green: '#26de81',
    yellow: '#fed330',
    blue: '#45aaf2'
  };
  
  // Animate piece movement
  useEffect(() => {
    if (piece.position !== prevPosition) {
      const path = calculatePath(prevPosition, piece.position, piece.color);
      
      if (path.length > 0) {
        slideSound.play();
        
        // Animate through each cell with hop
        const animateHop = async () => {
          for (const pos of path) {
            await animate(
              scope.current,
              { x: pos.x, y: pos.y },
              { duration: 0.15, ease: 'easeInOut' }
            );
            
            // Hop animation
            await animate(
              scope.current,
              { scale: [1, 1.2, 1] },
              { duration: 0.15 }
            );
          }
        };
        
        animateHop();
      }
      
      setPrevPosition(piece.position);
    }
  }, [piece.position, prevPosition, animate, scope, piece.color, slideSound]);
  
  const position = getPiecePosition(piece);
  
  return (
    <motion.g
      ref={scope}
      initial={{ x: position.x, y: position.y }}
      style={{ cursor: isSelectable ? 'pointer' : 'default' }}
      onClick={isSelectable ? onClick : undefined}
      whileHover={isSelectable ? { scale: 1.1 } : {}}
      whileTap={isSelectable ? { scale: 0.95 } : {}}
    >
      {/* Shadow */}
      <circle
        cx="0"
        cy="2"
        r="14"
        fill="black"
        opacity="0.2"
      />
      
      {/* Piece body */}
      <circle
        cx="0"
        cy="0"
        r="14"
        fill={colors[piece.color]}
        stroke="white"
        strokeWidth="2"
        opacity={isSelectable ? 1 : 0.8}
      />
      
      {/* Shine effect */}
      <circle
        cx="-3"
        cy="-3"
        r="5"
        fill="white"
        opacity="0.4"
      />
      
      {/* Selection indicator */}
      {isSelectable && (
        <motion.circle
          cx="0"
          cy="0"
          r="18"
          fill="none"
          stroke={colors[piece.color]}
          strokeWidth="2"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        />
      )}
    </motion.g>
  );
}