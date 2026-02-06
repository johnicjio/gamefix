import { SnakesState } from '../types';
import { SNAKES_MAP, LADDERS_MAP, SNAKES_BOARD_SIZE } from '../constants';

export const INITIAL_SNAKES_STATE: SnakesState = {
  positions: {},
  winner: null,
  currentTurn: '',
  lastRoll: null,
};

export const processSnakesMove = (
  currentState: SnakesState,
  playerId: string,
  roll: number,
  playerIds: string[]
): SnakesState => {
  // Invariants
  if (currentState.winner) return currentState;
  if (currentState.currentTurn !== playerId) return currentState;

  const currentPos = currentState.positions[playerId] || 0;
  let newPos = currentPos + roll;

  // Bounce rule (optional, but standard for arcade): 
  // If roll > 100, you don't move (or bounce back). Let's do simple: stay put if overshoot.
  if (newPos > SNAKES_BOARD_SIZE) {
    newPos = currentPos;
  }

  // Handle Snakes & Ladders
  // Note: Standard rules say you only take one jump. No chains.
  if (SNAKES_MAP[newPos]) {
    newPos = SNAKES_MAP[newPos];
  } else if (LADDERS_MAP[newPos]) {
    newPos = LADDERS_MAP[newPos];
  }

  const newPositions = { ...currentState.positions, [playerId]: newPos };
  let winner = currentState.winner;
  
  if (newPos === SNAKES_BOARD_SIZE) {
    winner = playerId;
  }

  // Next Turn
  let nextTurn = currentState.currentTurn;
  if (!winner) {
    const currentIndex = playerIds.indexOf(playerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    nextTurn = playerIds[nextIndex];
  }

  return {
    positions: newPositions,
    winner,
    currentTurn: nextTurn,
    lastRoll: roll,
  };
};
