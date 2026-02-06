export enum GameType {
  NONE = 'NONE',
  TIC_TAC_TOE = 'TIC_TAC_TOE',
  SNAKES_AND_LADDERS = 'SNAKES_AND_LADDERS',
  LUDO = 'LUDO',
}

export interface Player {
  id: string; // Peer ID
  name: string;
  color: string; // Hex code
  isHost: boolean;
  score: number;
}

// --- TIC TAC TOE ---
export interface TTTState {
  board: (string | null)[]; // 9 cells
  winner: string | null;
  isDraw: boolean;
  winningLine: number[] | null;
  currentTurn: string; // Player ID
}

// --- SNAKES AND LADDERS ---
export interface SnakesState {
  positions: Record<string, number>; // PlayerID -> Board Index (0-99)
  winner: string | null;
  currentTurn: string; // Player ID
  lastRoll: number | null;
}

// --- LUDO ---
export interface LudoPiece {
  id: number; // 0-3
  position: number; // -1 = home, 0-51 = main track, 52-57 = home stretch, 99 = finished
}

export interface LudoPlayerState {
  pieces: LudoPiece[];
  hasFinished: boolean;
}

export interface LudoState {
  players: Record<string, LudoPlayerState>; // PlayerID -> State
  currentTurn: string; // Player ID
  winner: string | null;
  diceRoll: number | null;
  canRoll: boolean; // True if player needs to roll, False if needs to move
  pendingMove: boolean; // Waiting for piece selection
}

// --- GLOBAL STATE ---
export interface GameState {
  sessionId: string;
  hostId: string;
  activeGame: GameType;
  players: Player[];
  playerOrder: string[]; // Array of IDs for turn rotation
  
  // Sub-states
  tictactoe: TTTState | null;
  snakes: SnakesState | null;
  ludo: LudoState | null;

  // Meta
  lastUpdated: number;
}

// --- NETWORKING ---
export enum MessageType {
  JOIN_REQUEST = 'JOIN_REQUEST',
  JOIN_ACCEPT = 'JOIN_ACCEPT',
  STATE_UPDATE = 'STATE_UPDATE',
  PLAYER_INPUT = 'PLAYER_INPUT',
  HEARTBEAT = 'HEARTBEAT',
}

export interface NetworkMessage {
  type: MessageType;
  payload: any;
  senderId: string;
  timestamp: number;
}

export interface InputPayload {
  game: GameType;
  action: string;
  data?: any;
}
