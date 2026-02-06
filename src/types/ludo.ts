export enum LudoColor {
  GREEN = 'green',
  YELLOW = 'yellow',
  BLUE = 'blue',
  RED = 'red'
}

export interface Player {
  id: string;
  name: string;
  color: LudoColor;
  isBot: boolean;
  avatar: string;
}

export interface Piece {
  id: string;
  color: LudoColor;
  position: number; // -1 = home, 0-50 = track, 51-56 = home stretch, 57 = finished
}

export interface GameState {
  gamePhase: 'SETUP' | 'PLAYING' | 'VICTORY';
  players: Player[];
  pieces: Piece[];
  currentTurn: number;
  diceValue: number | null;
  isRolling: boolean;
  isAnimating: boolean;
}

export interface NetworkConnection {
  role: 'HOST' | 'CLIENT' | 'OFFLINE';
  myId: string;
  isConnected: boolean;
  broadcastState: (state: GameState) => void;
  sendAction: (type: string, payload?: any) => void;
  onStateUpdate: (callback: (state: GameState) => void) => void;
  onActionReceived: (callback: (type: string, payload: any, senderId: string) => void) => void;
}

export interface GameProps {
  playerName: string;
  onGameEnd?: (winner: string) => void;
  network?: NetworkConnection;
}