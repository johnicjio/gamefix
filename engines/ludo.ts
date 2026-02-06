import { LudoState, LudoPlayerState, LudoPiece } from '../types';
import { LUDO_START_INDICES, LUDO_PATH_LENGTH } from '../constants';

// Simplified Ludo for 2-4 players
// No "Globe" safety zones except start.
// Standard capture rules.
// 6 rolls gives another turn.

export const INITIAL_LUDO_STATE: LudoState = {
  players: {},
  currentTurn: '',
  winner: null,
  diceRoll: null,
  canRoll: true,
  pendingMove: false,
};

export const initLudoPlayer = (): LudoPlayerState => ({
  pieces: [0, 1, 2, 3].map(id => ({ id, position: -1 })),
  hasFinished: false,
});

const getGlobalPosition = (playerIndex: number, relativePos: number): number | null => {
  if (relativePos < 0 || relativePos >= LUDO_PATH_LENGTH) return null; // Home or Home Stretch handling is separate
  const offset = LUDO_START_INDICES[playerIndex];
  return (relativePos + offset) % LUDO_PATH_LENGTH;
};

export const processLudoAction = (
  currentState: LudoState,
  playerId: string,
  action: 'ROLL' | 'MOVE',
  data: any, // data.pieceId for MOVE
  playerIds: string[]
): LudoState => {
  if (currentState.winner) return currentState;
  if (currentState.currentTurn !== playerId) return currentState;

  const playerIdx = playerIds.indexOf(playerId);
  const nextPlayerIdx = (playerIdx + 1) % playerIds.length;
  const nextPlayerId = playerIds[nextPlayerIdx];

  // --- ROLL LOGIC ---
  if (action === 'ROLL') {
    if (!currentState.canRoll) return currentState;
    
    // Randomness must be injected by Host before calling this pure function,
    // OR this function accepts the roll value.
    // For this architecture, let's assume 'data' contains the roll value determined by Host.
    const roll = data.roll as number;

    const playerState = currentState.players[playerId];
    
    // Check legal moves
    const legalMoves = playerState.pieces.filter(p => {
      if (p.position === -1) return roll === 6; // Can only start on 6
      if (p.position >= 100) return false; // Already finished (using 100+ for goal)
      
      // Check if move exceeds home stretch
      // Main track (0-51) -> Home Stretch (local 0-5)
      // Logic: Position is tracked as pure relative index 0-57 roughly?
      // Let's stick to: -1 (base), 0-51 (track), 52-57 (home stretch), 99 (done)
      
      if (p.position + roll > 57) return false; // Overshoot
      return true;
    });

    if (legalMoves.length === 0) {
      // No moves, pass turn immediately unless it's a 6 (usually 6 lets you roll again, but if no moves?)
      // Simplification: No moves = next turn.
      return {
        ...currentState,
        diceRoll: roll,
        canRoll: true, // Next person rolls
        pendingMove: false,
        currentTurn: roll === 6 ? playerId : nextPlayerId, // Bonus roll on 6 if rules allow, but sticking to simple for now. Let's say 6 gives repeat turn ONLY if you moved.
      };
    }

    // Auto-move if only 1 piece legal? No, let user click for clarity.
    return {
      ...currentState,
      diceRoll: roll,
      canRoll: false,
      pendingMove: true,
    };
  }

  // --- MOVE LOGIC ---
  if (action === 'MOVE') {
    if (currentState.canRoll || !currentState.pendingMove) return currentState;
    
    const pieceId = data.pieceId;
    const roll = currentState.diceRoll!;
    const newPlayers = JSON.parse(JSON.stringify(currentState.players)); // Deep copy
    const pState = newPlayers[playerId];
    const piece = pState.pieces.find((p: LudoPiece) => p.id === pieceId);

    if (!piece) return currentState;

    // Execute Move
    let newPos = piece.position;
    
    // Start condition
    if (piece.position === -1) {
      if (roll === 6) newPos = 0;
      else return currentState; // Should be impossible if filtered correctly
    } else {
      newPos += roll;
    }

    // Check Capture
    if (newPos < LUDO_PATH_LENGTH) {
       // Only capture on main track
       const globalPos = getGlobalPosition(playerIdx, newPos);
       
       // Iterate other players
       Object.keys(newPlayers).forEach(otherPid => {
         if (otherPid === playerId) return;
         const otherPState = newPlayers[otherPid];
         const otherPIdx = playerIds.indexOf(otherPid);
         
         otherPState.pieces.forEach((otherPiece: LudoPiece) => {
           if (otherPiece.position !== -1 && otherPiece.position < LUDO_PATH_LENGTH) {
             const otherGlobal = getGlobalPosition(otherPIdx, otherPiece.position);
             if (globalPos === otherGlobal) {
               // CAPTURE!
               otherPiece.position = -1; // Send back to base
             }
           }
         });
       });
    }

    // Update Piece
    piece.position = newPos;

    // Check Win Condition (All pieces at 99/End)
    // Here we use > 56 as end. Let's say 57 is final spot.
    if (piece.position === 57) piece.position = 99;
    
    const allDone = pState.pieces.every((p: LudoPiece) => p.position === 99);
    
    return {
      ...currentState,
      players: newPlayers,
      winner: allDone ? playerId : null,
      canRoll: true, // Next turn starts with a roll
      pendingMove: false,
      diceRoll: null,
      currentTurn: roll === 6 ? playerId : nextPlayerId, // 6 gets another turn
    };
  }

  return currentState;
};
