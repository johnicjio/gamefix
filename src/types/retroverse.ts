export type PlayerColor = 'RED' | 'GREEN' | 'YELLOW' | 'BLUE';
export type GameType = 'LUDO' | 'SNAKES' | 'TICTACTOE';
export type ConnectionRole = 'HOST' | 'CLIENT';
export type ConnectionStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING';

// --- Generic Game State ---
export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  isHost: boolean;
  avatar: string;
}

export interface GameState {
  activeGame: GameType | 'LOBBY';
  players: Player[];
  currentTurnIndex: number; // Index in players array
  diceValue: number | null;
  isRolling: boolean;
  connectionStatus: ConnectionStatus;
  hostId: string | null;
  
  // Ludo State
  ludoState: LudoState;
  
  // Snakes State
  snakesState: SnakesState;
  
  // TicTacToe State
  tictactoeState: TicTacToeState;
}

// --- Ludo Specifics ---
export interface LudoPiece {
  id: string; // e.g. "RED-0"
  color: PlayerColor;
  position: number; // -1 (Yard), 0-51 (Main), 52-56 (Home Stretch), 57 (Finished)
}

export interface LudoState {
  pieces: LudoPiece[];
  sixesCount: number; // Track consecutive sixes
  winners: PlayerColor[];
}

// --- Snakes Specifics ---
export interface SnakePlayerState {
  playerId: string;
  position: number; // 0 to 100
}

export interface SnakesState {
  playerPositions: SnakePlayerState[];
  winnerId: string | null;
}

// --- TicTacToe Specifics ---
export type TTTCell = 'X' | 'O' | null;

export interface TicTacToeState {
  board: TTTCell[];
  winningLine: number[] | null;
  winner: string | null; // Player ID
  draw: boolean;
}

// --- Networking ---
export type NetworkAction = 
  | { type: 'SYNC_STATE'; payload: GameState }
  | { type: 'ROLL_DICE_REQUEST'; payload: { playerId: string } }
  | { type: 'MOVE_PIECE_REQUEST'; payload: { pieceId: string, gameType: GameType } }
  | { type: 'TTT_MOVE_REQUEST'; payload: { index: number, playerId: string } }
  | { type: 'JOIN_GAME'; payload: { player: Player } }
  | { type: 'RESET_GAME'; payload: { gameType: GameType } };
