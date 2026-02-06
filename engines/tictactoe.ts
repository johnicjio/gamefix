import { TTTState } from '../types';

export const INITIAL_TTT_STATE: TTTState = {
  board: Array(9).fill(null),
  winner: null,
  isDraw: false,
  winningLine: null,
  currentTurn: '',
};

const WINNING_COMBINATIONS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
  [0, 4, 8], [2, 4, 6]             // Diagonals
];

export const processTTTMove = (
  currentState: TTTState,
  playerId: string,
  cellIndex: number,
  playerIds: string[]
): TTTState => {
  // Invariants
  if (currentState.winner || currentState.isDraw) return currentState;
  if (currentState.currentTurn !== playerId) return currentState;
  if (currentState.board[cellIndex] !== null) return currentState;

  // Mutation (via copying)
  const newBoard = [...currentState.board];
  newBoard[cellIndex] = playerId;

  // Check Win
  let winner = null;
  let winningLine = null;

  for (const combo of WINNING_COMBINATIONS) {
    const [a, b, c] = combo;
    if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
      winner = newBoard[a];
      winningLine = combo;
      break;
    }
  }

  // Check Draw
  const isDraw = !winner && newBoard.every(cell => cell !== null);

  // Next Turn
  let nextTurn = currentState.currentTurn;
  if (!winner && !isDraw) {
    const currentIndex = playerIds.indexOf(playerId);
    const nextIndex = (currentIndex + 1) % playerIds.length;
    nextTurn = playerIds[nextIndex];
  }

  return {
    board: newBoard,
    winner,
    isDraw,
    winningLine,
    currentTurn: nextTurn,
  };
};
