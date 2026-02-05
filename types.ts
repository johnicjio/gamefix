
// GameType enum updated to include all supported games in the arena
export enum GameType {
  LUDO = 'LUDO',
  WORD_QUEST = 'WORD_QUEST',
  WORD = 'WORD',
  CANDY_LAND = 'CANDY_LAND',
  BRAWLER = 'BRAWLER',
  SNAKE = 'SNAKE',
  TIC_TAC_TOE = 'TIC_TAC_TOE',
  CARROM = 'CARROM',
  SEANCE = 'SEANCE',
  NPAT = 'NPAT',
  ROCK_PAPER_SCISSORS = 'ROCK_PAPER_SCISSORS'
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

export interface QuizChallenge {
    question: string;
    answer: string;
    options: string[];
}

// Added missing types for Gemini and Networking services
export type ImageSize = "1K" | "2K" | "4K";

// --- MULTIPLAYER TYPES ---

export interface NetworkPayload {
    type: 'ACTION' | 'STATE_SYNC' | 'CHAT' | 'HANDSHAKE';
    data: any;
    senderId?: string;
    timestamp?: number;
}

export interface NetworkManager {
    role: 'HOST' | 'GUEST' | 'OFFLINE';
    myId: string;
    hostId?: string;
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

// Game-specific player and state interfaces
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
    answers: { name: string, place: string, animal: string, thing: string };
    scores: { name: number, place: number, animal: number, thing: number };
    totalScore: number;
    isReady: boolean;
    validationResults?: { name: boolean; place: boolean; animal: boolean; thing: boolean };
}

export interface NPATGameState {
    players: NPATPlayer[];
    gamePhase: 'LOBBY' | 'PLAYING' | 'SCORING' | 'LEADERBOARD';
    currentLetter: string;
    timeLeft: number;
    round: number;
    chatMessages?: ChatMessage[];
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

export interface SeancePlayer {
    id: string;
    name: string;
    color: string;
    cursorX: number;
    cursorY: number;
    isActive: boolean;
}

export interface SeanceState {
    planchette: { x: number, y: number, angle: number };
    hoverTarget: string | null;
    hoverTimer: number;
    selectedLetters: string[];
    phase: string;
    riddle: { question: string, answer: string } | null;
}
