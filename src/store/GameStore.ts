import { create } from 'zustand';

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Piece {
  id: string;
  color: PlayerColor;
  position: number; // -1 = yard, 0-51 = main track, 52-57 = home stretch, 100 = finished
  cellIndex: number; // for rendering
}

export interface GameState {
  // Game state
  pieces: Piece[];
  currentTurn: PlayerColor;
  diceValue: number | null;
  canRoll: boolean;
  isRolling: boolean;
  winner: PlayerColor | null;
  
  // Player info
  myColor: PlayerColor | null;
  isHost: boolean;
  gameId: string;
  connected: boolean;
  
  // Actions
  setPieces: (pieces: Piece[]) => void;
  setCurrentTurn: (color: PlayerColor) => void;
  setDiceValue: (value: number | null) => void;
  setCanRoll: (canRoll: boolean) => void;
  setIsRolling: (rolling: boolean) => void;
  setWinner: (color: PlayerColor | null) => void;
  setMyColor: (color: PlayerColor | null) => void;
  setIsHost: (isHost: boolean) => void;
  setGameId: (id: string) => void;
  setConnected: (connected: boolean) => void;
  
  // Game logic
  rollDice: () => number;
  movePiece: (pieceId: string, steps: number) => void;
  canMovePiece: (pieceId: string, steps: number) => boolean;
  getValidMoves: (steps: number) => string[];
  nextTurn: () => void;
  resetGame: () => void;
}

const COLORS: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

const createInitialPieces = (): Piece[] => {
  const pieces: Piece[] = [];
  COLORS.forEach((color) => {
    for (let i = 0; i < 4; i++) {
      pieces.push({
        id: `${color}-${i}`,
        color,
        position: -1, // Start in yard
        cellIndex: -1
      });
    }
  });
  return pieces;
};

// Get the starting position for each color on the main track
const getStartPosition = (color: PlayerColor): number => {
  const starts = { red: 0, green: 13, yellow: 26, blue: 39 };
  return starts[color];
};

// Get home stretch start for each color
const getHomeStretchStart = (color: PlayerColor): number => {
  return 52; // All home stretches start at position 52
};

// Check if a position is a safe zone
const isSafeZone = (position: number, color: PlayerColor): boolean => {
  const safePositions = {
    red: [0, 8],
    green: [13, 21],
    yellow: [26, 34],
    blue: [39, 47]
  };
  return safePositions[color]?.includes(position % 52) || false;
};

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  pieces: createInitialPieces(),
  currentTurn: 'red',
  diceValue: null,
  canRoll: true,
  isRolling: false,
  winner: null,
  myColor: null,
  isHost: false,
  gameId: '',
  connected: false,

  // Setters
  setPieces: (pieces) => set({ pieces }),
  setCurrentTurn: (color) => set({ currentTurn: color }),
  setDiceValue: (value) => set({ diceValue: value }),
  setCanRoll: (canRoll) => set({ canRoll }),
  setIsRolling: (rolling) => set({ isRolling: rolling }),
  setWinner: (color) => set({ winner: color }),
  setMyColor: (color) => set({ myColor: color }),
  setIsHost: (isHost) => set({ isHost }),
  setGameId: (id) => set({ gameId: id }),
  setConnected: (connected) => set({ connected }),

  // Roll dice (host only)
  rollDice: () => {
    const value = Math.floor(Math.random() * 6) + 1;
    set({ diceValue: value, canRoll: false, isRolling: true });
    
    setTimeout(() => {
      set({ isRolling: false });
    }, 1000);
    
    return value;
  },

  // Check if a piece can move
  canMovePiece: (pieceId: string, steps: number) => {
    const { pieces, currentTurn } = get();
    const piece = pieces.find(p => p.id === pieceId);
    
    if (!piece || piece.color !== currentTurn) return false;
    
    // Need 6 to leave yard
    if (piece.position === -1) {
      return steps === 6;
    }
    
    // Already finished
    if (piece.position === 100) return false;
    
    // In home stretch
    if (piece.position >= 52) {
      const newPos = piece.position + steps;
      return newPos <= 57; // Can't overshoot
    }
    
    // On main track
    const startPos = getStartPosition(piece.color);
    const distanceFromStart = (piece.position - startPos + 52) % 52;
    
    // Check if entering home stretch
    if (distanceFromStart + steps >= 51) {
      const homePos = 52 + (distanceFromStart + steps - 51);
      return homePos <= 57;
    }
    
    return true;
  },

  // Get all pieces that can move
  getValidMoves: (steps: number) => {
    const { pieces, currentTurn, canMovePiece } = get();
    return pieces
      .filter(p => p.color === currentTurn)
      .filter(p => canMovePiece(p.id, steps))
      .map(p => p.id);
  },

  // Move a piece
  movePiece: (pieceId: string, steps: number) => {
    const { pieces, currentTurn, canMovePiece } = get();
    
    if (!canMovePiece(pieceId, steps)) return;
    
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) return;
    
    const newPieces = [...pieces];
    const pieceIndex = newPieces.findIndex(p => p.id === pieceId);
    
    // Leaving yard
    if (piece.position === -1) {
      const startPos = getStartPosition(piece.color);
      newPieces[pieceIndex] = { ...piece, position: startPos, cellIndex: startPos };
    } else if (piece.position >= 52) {
      // In home stretch
      const newPos = piece.position + steps;
      if (newPos === 57) {
        newPieces[pieceIndex] = { ...piece, position: 100, cellIndex: 100 }; // Finished
      } else {
        newPieces[pieceIndex] = { ...piece, position: newPos, cellIndex: newPos };
      }
    } else {
      // On main track
      const startPos = getStartPosition(piece.color);
      const distanceFromStart = (piece.position - startPos + 52) % 52;
      
      // Check if entering home stretch
      if (distanceFromStart + steps >= 51) {
        const homePos = 52 + (distanceFromStart + steps - 51);
        newPieces[pieceIndex] = { ...piece, position: homePos, cellIndex: homePos };
      } else {
        const newPos = (piece.position + steps) % 52;
        newPieces[pieceIndex] = { ...piece, position: newPos, cellIndex: newPos };
        
        // Check for capture (if not on safe zone)
        if (!isSafeZone(newPos, piece.color)) {
          newPieces.forEach((p, idx) => {
            if (p.id !== pieceId && p.position === newPos && p.color !== currentTurn) {
              // Send opponent back to yard
              newPieces[idx] = { ...p, position: -1, cellIndex: -1 };
            }
          });
        }
      }
    }
    
    // Check for winner
    const finishedCount = newPieces.filter(
      p => p.color === currentTurn && p.position === 100
    ).length;
    
    if (finishedCount === 4) {
      set({ pieces: newPieces, winner: currentTurn });
      return;
    }
    
    set({ pieces: newPieces });
  },

  // Next turn
  nextTurn: () => {
    const { currentTurn, diceValue } = get();
    
    // If rolled 6, player goes again
    if (diceValue === 6) {
      set({ canRoll: true, diceValue: null });
      return;
    }
    
    // Otherwise, next player
    const currentIndex = COLORS.indexOf(currentTurn);
    const nextColor = COLORS[(currentIndex + 1) % COLORS.length];
    set({ currentTurn: nextColor, canRoll: true, diceValue: null });
  },

  // Reset game
  resetGame: () => set({
    pieces: createInitialPieces(),
    currentTurn: 'red',
    diceValue: null,
    canRoll: true,
    isRolling: false,
    winner: null
  })
}));