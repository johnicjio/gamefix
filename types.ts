export type GameType = 'ludo' | 'tictactoe' | 'rps' | 'snakeladders';

export interface GameMessage {
  type: string;
  payload: any;
}

export interface Player {
  id: string;
  name: string;
  color?: string;
}

// Ludo types
export interface LudoPiece {
  id: string;
  color: 'red' | 'blue' | 'green' | 'yellow';
  position: number; // -1 = home, 0-51 = board, 52-57 = safe zone, 100 = finished
  isInPlay: boolean;
}

export interface LudoGameState {
  pieces: LudoPiece[];
  currentPlayer: number;
  diceValue: number | null;
  lastRoll: number;
  canRollDice: boolean;
}

// Tic Tac Toe types
export type Cell = 'X' | 'O' | null;

export interface TicTacToeGameState {
  board: Cell[];
  currentPlayer: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
}

// Rock Paper Scissors types
export type RPSChoice = 'rock' | 'paper' | 'scissors' | null;

export interface RPSGameState {
  player1Choice: RPSChoice;
  player2Choice: RPSChoice;
  player1Score: number;
  player2Score: number;
  round: number;
  winner: string | null;
  showResult: boolean;
}

// Snake and Ladders types
export interface SnakeLadder {
  from: number;
  to: number;
  type: 'snake' | 'ladder';
}

export interface SnakeLaddersGameState {
  players: {
    position: number;
    color: string;
  }[];
  currentPlayer: number;
  diceValue: number | null;
  winner: number | null;
  canRollDice: boolean;
}