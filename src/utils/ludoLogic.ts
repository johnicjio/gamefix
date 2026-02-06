import { Piece, LudoColor } from '../types/ludo';

// Starting positions on the main track for each color
export const START_OFFSETS: Record<LudoColor, number> = {
  [LudoColor.GREEN]: 0,
  [LudoColor.YELLOW]: 13,
  [LudoColor.BLUE]: 26,
  [LudoColor.RED]: 39
};

// Safe positions on the main track
const SAFE_POSITIONS = [0, 8, 13, 21, 26, 34, 39, 47];

// Check if a piece can move with given dice value
export function canMove(piece: Piece, diceValue: number): boolean {
  // In home, need 6 to start
  if (piece.position === -1) return diceValue === 6;
  
  // Already finished
  if (piece.position === 57) return false;
  
  // On main track (0-50)
  if (piece.position < 51) {
    return piece.position + diceValue <= 57;
  }
  
  // In home stretch (51-56)
  const newPos = piece.position + diceValue;
  return newPos <= 57;
}

// Get global position on the board
export function getGlobalPosition(piece: Piece): number {
  if (piece.position === -1 || piece.position > 50) return -1;
  return (START_OFFSETS[piece.color] + piece.position) % 52;
}

// Check if position is safe
export function isSafePosition(globalPos: number): boolean {
  return SAFE_POSITIONS.includes(globalPos);
}

// AI Move scoring
interface MoveScore {
  piece: Piece;
  score: number;
}

export function getSmartAIMove(
  myPieces: Piece[],
  allPieces: Piece[],
  diceValue: number,
  myColor: LudoColor
): MoveScore | null {
  const validPieces = myPieces.filter(p => canMove(p, diceValue));
  if (validPieces.length === 0) return null;
  
  const scores: MoveScore[] = validPieces.map(piece => {
    let score = 0;
    const startPos = piece.position;
    const targetPos = startPos === -1 ? 0 : startPos + diceValue;
    
    // Prioritize finishing
    if (targetPos === 57) score += 1000;
    
    // Prioritize moving into home stretch
    if (targetPos > 50 && targetPos < 57) score += 500;
    
    // Check for captures
    if (targetPos <= 50) {
      const globalPos = (START_OFFSETS[myColor] + targetPos) % 52;
      const canCapture = allPieces.some(p => 
        p.color !== myColor &&
        p.position !== -1 &&
        p.position <= 50 &&
        getGlobalPosition(p) === globalPos &&
        !isSafePosition(globalPos)
      );
      if (canCapture) score += 300;
    }
    
    // Prioritize leaving home
    if (startPos === -1) score += 200;
    
    // Prefer moving pieces further ahead
    score += targetPos * 2;
    
    // Avoid staying in vulnerable positions
    if (targetPos <= 50) {
      const globalPos = (START_OFFSETS[myColor] + targetPos) % 52;
      if (!isSafePosition(globalPos)) {
        const threats = allPieces.filter(p => 
          p.color !== myColor &&
          p.position !== -1 &&
          p.position <= 50
        );
        if (threats.length > 0) score -= 50;
      }
    }
    
    return { piece, score };
  });
  
  // Return best move
  scores.sort((a, b) => b.score - a.score);
  return scores[0];
}

// Calculate piece rendering position
export function getPieceCoordinates(piece: Piece): { x: number; y: number } {
  if (piece.position === -1) {
    // In home area
    const homes = {
      [LudoColor.GREEN]: { x: 100, y: 100 },
      [LudoColor.YELLOW]: { x: 400, y: 100 },
      [LudoColor.BLUE]: { x: 400, y: 400 },
      [LudoColor.RED]: { x: 100, y: 400 }
    };
    const home = homes[piece.color];
    const pieceIndex = parseInt(piece.id.split('-')[1]);
    const offsets = [
      { x: -20, y: -20 },
      { x: 20, y: -20 },
      { x: -20, y: 20 },
      { x: 20, y: 20 }
    ];
    return { x: home.x + offsets[pieceIndex].x, y: home.y + offsets[pieceIndex].y };
  }
  
  if (piece.position === 57) {
    // Finished - center
    return { x: 250, y: 250 };
  }
  
  if (piece.position > 50) {
    // Home stretch
    const stretches = {
      [LudoColor.GREEN]: { startX: 250, startY: 370, dx: 0, dy: -40 },
      [LudoColor.YELLOW]: { startX: 370, startY: 250, dx: -40, dy: 0 },
      [LudoColor.BLUE]: { startX: 250, startY: 130, dx: 0, dy: 40 },
      [LudoColor.RED]: { startX: 130, startY: 250, dx: 40, dy: 0 }
    };
    const stretch = stretches[piece.color];
    const offset = piece.position - 51;
    return { x: stretch.startX + stretch.dx * offset, y: stretch.startY + stretch.dy * offset };
  }
  
  // Main track
  const globalPos = getGlobalPosition(piece);
  const trackCoords = getTrackCoordinates(globalPos);
  return trackCoords;
}

// Get coordinates for main track positions
function getTrackCoordinates(globalPos: number): { x: number; y: number } {
  const cellSize = 40;
  const coords: { x: number; y: number }[] = [];
  
  // Generate 52 track positions in clockwise order
  // Bottom row (Green start)
  for (let i = 0; i < 6; i++) coords.push({ x: 130 + i * cellSize, y: 370 });
  
  // Right column going up
  for (let i = 0; i < 6; i++) coords.push({ x: 370, y: 370 - (i + 1) * cellSize });
  
  // Top row going left (Yellow start at 13)
  for (let i = 0; i < 6; i++) coords.push({ x: 370 - (i + 1) * cellSize, y: 130 });
  
  // Left column going up
  for (let i = 0; i < 6; i++) coords.push({ x: 130, y: 130 - (i + 1) * cellSize });
  
  // Top row reverse (Blue start at 26)
  for (let i = 0; i < 6; i++) coords.push({ x: 130 - (i + 1) * cellSize, y: -50 });
  
  // Left column going down
  for (let i = 0; i < 6; i++) coords.push({ x: -50, y: -50 + (i + 1) * cellSize });
  
  // Bottom row going right (Red start at 39)
  for (let i = 0; i < 6; i++) coords.push({ x: -50 + (i + 1) * cellSize, y: 130 });
  
  // Right column going down
  for (let i = 0; i < 6; i++) coords.push({ x: 130, y: 130 + (i + 1) * cellSize });
  
  return coords[globalPos % 52] || { x: 250, y: 250 };
}