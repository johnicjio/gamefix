

export enum GameType {
  LUDO = 'LUDO',
  SNAKE = 'SNAKE',
  TIC_TAC_TOE = 'TIC_TAC_TOE',
  ROCK_PAPER_SCISSORS = 'ROCK_PAPER_SCISSORS',
  CARROM = 'CARROM',
  BRAWLER = 'BRAWLER',
  CANDY_LAND = 'CANDY_LAND',
  NEON_CRUSH = 'NEON_CRUSH'
}

export enum LudoColor {
  GREEN = 'GREEN',
  YELLOW = 'YELLOW',
  BLUE = 'BLUE',
  RED = 'RED',
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
  position: number; // -1 = Base, 0-51 = Main Path, 52-56 = Home Stretch, 57 = Home
}

export interface NetworkPayload {
    type: 'ACTION' | 'STATE_SYNC' | 'CHAT' | 'HANDSHAKE';
    data: any;
    senderId?: string;
    timestamp?: number;
}

export interface NetworkManager {
    role: 'HOST' | 'GUEST' | 'OFFLINE';
    myId: string;
    isConnected: boolean;
    sendAction: (actionType: string, payload?: any) => void;
    broadcastState: (state: any) => void;
    onStateUpdate: (callback: (state: any) => void) => void;
    onActionReceived: (callback: (actionType: string, payload: any, senderId: string) => void) => void;
}

export interface GameProps {
  playerName: string;
  onGameEnd?: (winner: string, losers?: string[]) => void;
  network?: NetworkManager;
  roomId?: string;
}

export interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    text: string;
    timestamp: number;
    isSystem?: boolean;
}

export interface CarromPlayer {
    id: string;
    name: string;
    seatIndex: number;
    isBot: boolean;
    ownerId?: string;
    score: number;
    isReady: boolean;
    isConnected: boolean;
}

export interface CarromPiece {
    id: string;
    type: 'WHITE' | 'BLACK' | 'QUEEN' | 'STRIKER';
    x: number;
    y: number;
    vx: number;
    vy: number;
    isPocketed: boolean;
    opacity: number;
}

export interface CrushCell {
  id: string;
  type: number;
  x: number;
  y: number;
}

// Added missing types to resolve import errors in various components

export interface QuizChallenge {
  question: string;
  answer: string;
  options: string[];
  forPlayerId: string;
  victimId: string;
}

export type ImageSize = '1K' | '2K' | '4K';

export interface WordPlayer {
  id: number;
  name: string;
  isEliminated: boolean;
  ownerId?: string;
}

export interface NPATPlayer {
  id: string;
  name: string;
  ownerId: string;
  answers: {
    name: string;
    place: string;
    animal: string;
    thing: string;
  };
  scores: {
    name: number;
    place: number;
    animal: number;
    thing: number;
  };
  totalScore: number;
  isReady: boolean;
}

export interface SeancePlayer {
  id: string;
  name: string;
  color: string;
  cursorX: number;
  cursorY: number;
  isActive: boolean;
}
