import { LudoPiece, PlayerColor } from '../types/retroverse';

// --- LUDO CONSTANTS ---
export const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47]; // Global indices on main track

// Start positions on the main track (0-51)
export const START_OFFSETS: Record<PlayerColor, number> = {
  'GREEN': 0,
  'YELLOW': 13,
  'BLUE': 26,
  'RED': 39
};

// --- SNAKES AND LADDERS CONSTANTS ---
export const SNAKES: Record<number, number> = {
  16: 6,
  47: 26,
  49: 11,
  56: 53,
  62: 19,
  64: 60,
  87: 24,
  93: 73,
  95: 75,
  98: 78
};

export const LADDERS: Record<number, number> = {
  1: 38,
  4: 14,
  9: 31,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  80: 100
};
