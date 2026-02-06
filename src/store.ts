import { create } from 'zustand';

export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export interface Piece {
  id: string;
  color: PlayerColor;
  position: number; // -1 = yard, 0-51 = main track, 52-57 = home stretch, 58 = finished
  cellIndex: number; // actual board position for rendering
}

export interface GameState {
  pieces: Piece[];
  currentTurn: PlayerColor;
  diceValue: number | null;
  canRoll: boolean;
  myColor: PlayerColor | null;
  isHost: boolean;
  peerId: string;
  remotePeerId: string;
  winner: PlayerColor | null;
  rollingDice: boolean;
}

export interface GameStore extends GameState {
  setPieces: (pieces: Piece[]) => void;
  setCurrentTurn: (color: PlayerColor) => void;
  setDiceValue: (value: number | null) => void;
  setCanRoll: (canRoll: boolean) => void;
  setMyColor: (color: PlayerColor | null) => void;
  setIsHost: (isHost: boolean) => void;
  setPeerId: (id: string) => void;
  setRemotePeerId: (id: string) => void;
  setWinner: (color: PlayerColor | null) => void;
  setRollingDice: (rolling: boolean) => void;
  movePiece: (pieceId: string, targetPosition: number) => void;
  resetGame: () => void;
}

const createInitialPieces = (): Piece[] => {
  const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
  const pieces: Piece[] = [];
  
  colors.forEach((color) => {
    for (let i = 0; i < 4; i++) {
      pieces.push({
        id: `${color}-${i}`,
        color,
        position: -1,
        cellIndex: -1
      });
    }
  });
  
  return pieces;
};

export const useGameStore = create<GameStore>((set) => ({
  pieces: createInitialPieces(),
  currentTurn: 'red',
  diceValue: null,
  canRoll: true,
  myColor: null,
  isHost: false,
  peerId: '',
  remotePeerId: '',
  winner: null,
  rollingDice: false,

  setPieces: (pieces) => set({ pieces }),
  setCurrentTurn: (color) => set({ currentTurn: color }),
  setDiceValue: (value) => set({ diceValue: value }),
  setCanRoll: (canRoll) => set({ canRoll }),
  setMyColor: (color) => set({ myColor: color }),
  setIsHost: (isHost) => set({ isHost }),
  setPeerId: (id) => set({ peerId: id }),
  setRemotePeerId: (id) => set({ remotePeerId: id }),
  setWinner: (color) => set({ winner: color }),
  setRollingDice: (rolling) => set({ rollingDice: rolling }),

  movePiece: (pieceId, targetPosition) => set((state) => {
    const pieces = state.pieces.map((p) =>
      p.id === pieceId ? { ...p, position: targetPosition, cellIndex: targetPosition } : p
    );
    return { pieces };
  }),

  resetGame: () => set({
    pieces: createInitialPieces(),
    currentTurn: 'red',
    diceValue: null,
    canRoll: true,
    winner: null,
    rollingDice: false
  })
}));