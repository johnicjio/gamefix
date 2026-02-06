import { GameType } from './types';

export const COLORS = [
  '#FF0055', // Red
  '#00F0FF', // Cyan
  '#FFFF00', // Yellow
  '#00FF99', // Green
];

export const SNAKES_BOARD_SIZE = 100;

export const SNAKES_MAP: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78,
};

export const LADDERS_MAP: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100,
};

export const LUDO_PATH_LENGTH = 52;
export const LUDO_HOME_STRETCH_LENGTH = 6;
// Starting positions on the main track for each of the 4 players (indices 0-51)
export const LUDO_START_INDICES = [0, 13, 26, 39]; 
