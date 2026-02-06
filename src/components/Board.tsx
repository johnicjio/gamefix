import { motion } from 'framer-motion';
import { useMemo } from 'react';

// Cell positions on the board (52 main track cells)
const CELL_SIZE = 40;
const BOARD_CENTER = 300;

// Generate cell coordinates for the main track
export function getCellCoordinates(index: number): { x: number; y: number } {
  const cellPositions: Array<{ x: number; y: number }> = [];
  
  // Bottom row (Red start) - indices 0-5
  for (let i = 0; i < 6; i++) {
    cellPositions.push({ x: 240 + i * CELL_SIZE, y: 360 });
  }
  
  // Right column going up - indices 6-11
  for (let i = 0; i < 6; i++) {
    cellPositions.push({ x: 480, y: 360 - (i + 1) * CELL_SIZE });
  }
  
  // Top row going left (Yellow start at 26) - indices 12-17  
  for (let i = 0; i < 6; i++) {
    cellPositions.push({ x: 480 - (i + 1) * CELL_SIZE, y: 120 });
  }
  
  // Left column going up - indices 18-25
  for (let i = 0; i < 6; i++) {
    cellPositions.push({ x: 240, y: 120 - (i + 1) * CELL_SIZE });
  }
  
  // Top row reverse (indices 26-31) - Yellow territory
  for (let i = 0; i < 6; i++) {
    cellPositions.push({ x: 240 - (i + 1) * CELL_SIZE, y: -120 });
  }
  
  // Left column going down (indices 32-37)
  for (let i = 0; i < 6; i++) {
    cellPositions.push({ x: -0, y: -120 + (i + 1) * CELL_SIZE });
  }
  
  // Bottom row going right (Blue start at 39) - indices 38-43
  for (let i = 0; i < 6; i++) {
    cellPositions.push({ x: 0 + (i + 1) * CELL_SIZE, y: 120 });
  }
  
  // Right column going down - indices 44-51
  for (let i = 0; i < 6; i++) {
    cellPositions.push({ x: 240, y: 120 + (i + 1) * CELL_SIZE });
  }
  
  return cellPositions[index % 52] || { x: BOARD_CENTER, y: BOARD_CENTER };
}

// Home stretch coordinates
export function getHomeStretchCoordinates(position: number, color: string): { x: number; y: number } {
  const homeStretches = {
    red: { startX: 300, startY: 360, dx: 0, dy: -CELL_SIZE },
    green: { startX: 480, startY: 300, dx: -CELL_SIZE, dy: 0 },
    yellow: { startX: 300, startY: 120, dx: 0, dy: CELL_SIZE },
    blue: { startX: 0, startY: 300, dx: CELL_SIZE, dy: 0 }
  };
  
  const stretch = homeStretches[color as keyof typeof homeStretches];
  const offset = position - 52;
  
  return {
    x: stretch.startX + stretch.dx * offset,
    y: stretch.startY + stretch.dy * offset
  };
}

// Yard positions for pieces
export function getYardPosition(color: string, pieceIndex: number): { x: number; y: number } {
  const yards = {
    red: { centerX: 120, centerY: 480 },
    green: { centerX: 480, centerY: 480 },
    yellow: { centerX: 480, centerY: 120 },
    blue: { centerX: 120, centerY: 120 }
  };
  
  const yard = yards[color as keyof typeof yards];
  const offsets = [
    { x: -25, y: -25 },
    { x: 25, y: -25 },
    { x: -25, y: 25 },
    { x: 25, y: 25 }
  ];
  
  const offset = offsets[pieceIndex];
  return {
    x: yard.centerX + offset.x,
    y: yard.centerY + offset.y
  };
}

export default function Board() {
  const safeCells = useMemo(() => [0, 8, 13, 21, 26, 34, 39, 47], []);
  
  return (
    <svg
      width="600"
      height="600"
      viewBox="0 0 600 600"
      className="mx-auto drop-shadow-2xl"
    >
      {/* Background */}
      <rect width="600" height="600" fill="#1a1a2e" />
      
      {/* Quadrants */}
      <g>
        {/* Red quadrant (bottom-left) */}
        <rect x="0" y="360" width="240" height="240" fill="#FF4757" opacity="0.2" />
        <rect x="40" y="400" width="160" height="160" fill="#FF4757" opacity="0.4" rx="20" />
        
        {/* Green quadrant (bottom-right) */}
        <rect x="360" y="360" width="240" height="240" fill="#26de81" opacity="0.2" />
        <rect x="400" y="400" width="160" height="160" fill="#26de81" opacity="0.4" rx="20" />
        
        {/* Yellow quadrant (top-right) */}
        <rect x="360" y="0" width="240" height="240" fill="#fed330" opacity="0.2" />
        <rect x="400" y="40" width="160" height="160" fill="#fed330" opacity="0.4" rx="20" />
        
        {/* Blue quadrant (top-left) */}
        <rect x="0" y="0" width="240" height="240" fill="#45aaf2" opacity="0.2" />
        <rect x="40" y="40" width="160" height="160" fill="#45aaf2" opacity="0.4" rx="20" />
      </g>
      
      {/* Center home */}
      <g>
        <polygon
          points="300,240 360,300 300,360 240,300"
          fill="#FFD700"
          stroke="#FFA500"
          strokeWidth="3"
        />
        <circle cx="300" cy="300" r="15" fill="#FFA500" />
      </g>
      
      {/* Main track cells */}
      <g>
        {Array.from({ length: 52 }).map((_, i) => {
          const { x, y } = getCellCoordinates(i);
          const isSafe = safeCells.includes(i);
          const color = i < 13 ? '#FF4757' : i < 26 ? '#26de81' : i < 39 ? '#fed330' : '#45aaf2';
          
          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={CELL_SIZE - 4}
                height={CELL_SIZE - 4}
                fill="white"
                stroke={isSafe ? color : '#ddd'}
                strokeWidth={isSafe ? 3 : 1}
                rx="4"
                opacity="0.9"
              />
              {isSafe && (
                <text
                  x={x + CELL_SIZE / 2}
                  y={y + CELL_SIZE / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="16"
                >
                  ⭐
                </text>
              )}
            </g>
          );
        })}
      </g>
      
      {/* Home stretch paths */}
      <g>
        {/* Red home stretch */}
        {Array.from({ length: 6 }).map((_, i) => (
          <rect
            key={`red-${i}`}
            x={300}
            y={360 - (i + 1) * CELL_SIZE}
            width={CELL_SIZE - 4}
            height={CELL_SIZE - 4}
            fill="#FF4757"
            opacity="0.6"
            rx="4"
          />
        ))}
        
        {/* Green home stretch */}
        {Array.from({ length: 6 }).map((_, i) => (
          <rect
            key={`green-${i}`}
            x={480 - (i + 1) * CELL_SIZE}
            y={300}
            width={CELL_SIZE - 4}
            height={CELL_SIZE - 4}
            fill="#26de81"
            opacity="0.6"
            rx="4"
          />
        ))}
        
        {/* Yellow home stretch */}
        {Array.from({ length: 6 }).map((_, i) => (
          <rect
            key={`yellow-${i}`}
            x={300}
            y={120 + (i + 1) * CELL_SIZE}
            width={CELL_SIZE - 4}
            height={CELL_SIZE - 4}
            fill="#fed330"
            opacity="0.6"
            rx="4"
          />
        ))}
        
        {/* Blue home stretch */}
        {Array.from({ length: 6 }).map((_, i) => (
          <rect
            key={`blue-${i}`}
            x={0 + (i + 1) * CELL_SIZE}
            y={300}
            width={CELL_SIZE - 4}
            height={CELL_SIZE - 4}
            fill="#45aaf2"
            opacity="0.6"
            rx="4"
          />
        ))}
      </g>
    </svg>
  );
}