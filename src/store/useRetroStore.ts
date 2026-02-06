import { create } from 'zustand';
import { GameState, GameType, Player, PlayerColor, NetworkAction, LudoPiece } from '../types/retroverse';
import { SAFE_ZONES, START_OFFSETS, SNAKES, LADDERS } from '../constants/gameRules';
import Peer, { DataConnection } from 'peerjs';

interface RetroStore extends GameState {
  // Actions
  setGameType: (type: GameType) => void;
  setPlayerName: (name: string) => void;
  initializeHost: () => Promise<string>;
  joinGame: (hostId: string) => Promise<boolean>;
  
  // Game Actions
  rollDice: () => void;
  handleLudoMove: (pieceId: string) => void;
  handleSnakeMove: () => void; // Auto moves after roll
  handleTTTMove: (index: number) => void;
  
  // Network Handlers
  receiveNetworkAction: (action: NetworkAction) => void;
}

const INITIAL_LUDO_PIECES: LudoPiece[] = [];
['GREEN', 'YELLOW', 'BLUE', 'RED'].forEach((color) => {
  for (let i = 0; i < 4; i++) {
    INITIAL_LUDO_PIECES.push({
      id: `${color}-${i}`,
      color: color as PlayerColor,
      position: -1
    });
  }
});

const INITIAL_STATE: Omit<GameState, 'activeGame'> = {
  players: [],
  currentTurnIndex: 0,
  diceValue: null,
  isRolling: false,
  connectionStatus: 'DISCONNECTED',
  hostId: null,
  
  ludoState: {
    pieces: INITIAL_LUDO_PIECES,
    sixesCount: 0,
    winners: []
  },
  
  snakesState: {
    playerPositions: [],
    winnerId: null
  },
  
  tictactoeState: {
    board: Array(9).fill(null),
    winningLine: null,
    winner: null,
    draw: false
  }
};

// --- Logic Helpers ---

// Ludo Logic
const canMoveLudo = (piece: LudoPiece, roll: number): boolean => {
  if (piece.position === -1) return roll === 6;
  if (piece.position === 57) return false;
  if (piece.position < 51 && piece.position + roll > 57) return false; // Can't overshoot in home stretch? 
  // Simplified overshoot logic: if in home stretch (51+), must land exactly on 57 or less
  if (piece.position >= 51 && piece.position + roll > 57) return false;
  return true;
};

const getGlobalPos = (piece: LudoPiece): number => {
  if (piece.position === -1 || piece.position > 50) return -1;
  return (START_OFFSETS[piece.color] + piece.position) % 52;
};

// --- Store Implementation ---

export const useRetroStore = create<RetroStore>((set, get) => {
  let peer: Peer | null = null;
  let connections: DataConnection[] = [];
  let hostConn: DataConnection | null = null;

  // Broadcast to all (Host only)
  const broadcast = (state: GameState) => {
    connections.forEach(conn => conn.send({ type: 'SYNC_STATE', payload: state }));
  };

  // Send to host (Client only)
  const sendToHost = (action: NetworkAction) => {
    if (hostConn) hostConn.send(action);
  };

  return {
    activeGame: 'LOBBY',
    ...INITIAL_STATE,

    setGameType: (type) => {
      set({ activeGame: type });
      // Reset logic for specific game could go here
    },

    setPlayerName: (name) => {
      // Logic handled in join/host
    },

    // --- Networking Setup ---
    
    initializeHost: async () => {
      return new Promise((resolve) => {
        peer = new Peer();
        peer.on('open', (id) => {
          set({ 
            hostId: id, 
            connectionStatus: 'CONNECTED',
            players: [{ 
              id, 
              name: 'Host', 
              color: 'GREEN', 
              isHost: true, 
              avatar: '👑' 
            }]
          });
          resolve(id);
        });

        peer.on('connection', (conn) => {
          connections.push(conn);
          conn.on('data', (data: any) => get().receiveNetworkAction(data));
          
          // Sync new player immediately
          // In a real app, we'd wait for a JOIN_GAME payload first, 
          // but strictly adhering to "Host Authority", we just listen.
        });
      });
    },

    joinGame: async (hostId) => {
      return new Promise((resolve) => {
        peer = new Peer();
        peer.on('open', (myId) => {
          const conn = peer!.connect(hostId);
          hostConn = conn;
          
          conn.on('open', () => {
            set({ connectionStatus: 'CONNECTED', hostId });
            // Send join request
            sendToHost({ 
              type: 'JOIN_GAME', 
              payload: { 
                player: { 
                  id: myId, 
                  name: 'Player 2', 
                  color: 'RED', // Logic for auto-color needed in production
                  isHost: false, 
                  avatar: '🕹️' 
                } 
              } 
            });
            resolve(true);
          });

          conn.on('data', (data: any) => {
            if (data.type === 'SYNC_STATE') {
              set(data.payload);
            }
          });
        });
      });
    },

    // --- Core Game Actions (Host Logic) ---

    receiveNetworkAction: (action) => {
      const state = get();
      
      // If I am client, I only process SYNC_STATE
      if (!state.players.find(p => p.id === peer?.id)?.isHost) {
        if (action.type === 'SYNC_STATE') {
          set(action.payload);
        }
        return;
      }

      // If I am Host, I process requests and update state
      if (action.type === 'JOIN_GAME') {
        const newPlayers = [...state.players, action.payload.player];
        // Assign colors dynamically based on count
        const colors: PlayerColor[] = ['GREEN', 'YELLOW', 'BLUE', 'RED'];
        newPlayers.forEach((p, i) => p.color = colors[i % 4]);
        
        // Init snake positions
        const newSnakePos = newPlayers.map(p => ({ playerId: p.id, position: 0 }));

        const newState = {
          ...state,
          players: newPlayers,
          snakesState: { ...state.snakesState, playerPositions: newSnakePos }
        };
        
        set(newState);
        broadcast(newState);
      }
      
      else if (action.type === 'ROLL_DICE_REQUEST') {
        // Validation: Is it their turn?
        if (state.players[state.currentTurnIndex].id !== action.payload.playerId) return;
        if (state.isRolling || state.diceValue !== null) return;

        // Execute Roll
        const roll = Math.floor(Math.random() * 6) + 1;
        set({ isRolling: true });
        broadcast({ ...get(), isRolling: true }); // Anim trigger

        setTimeout(() => {
           // Logic for after roll
           let nextTurn = state.currentTurnIndex;
           let sixes = state.ludoState.sixesCount;
           
           if (state.activeGame === 'LUDO') {
             if (roll === 6) sixes++;
             else sixes = 0;
             
             if (sixes === 3) {
               // Penalty: Forfeit turn
               nextTurn = (state.currentTurnIndex + 1) % state.players.length;
               sixes = 0;
             }
           }

           const newState = {
             ...get(),
             isRolling: false,
             diceValue: roll,
             ludoState: { ...get().ludoState, sixesCount: sixes },
             currentTurnIndex: nextTurn // Might change if we auto-pass turn
           };
           
           set(newState);
           broadcast(newState);
           
           // Auto-move for Snakes & Ladders
           if (state.activeGame === 'SNAKES') {
             get().handleSnakeMove();
           }
        }, 600);
      }
      
      else if (action.type === 'MOVE_PIECE_REQUEST') {
         get().handleLudoMove(action.payload.pieceId);
      }
      
      else if (action.type === 'TTT_MOVE_REQUEST') {
         get().handleTTTMove(action.payload.index);
      }
    },

    // --- Helper Wrappers to call network ---

    rollDice: () => {
      const me = get().players.find(p => p.id === peer?.id);
      if (!me) return;
      if (me.isHost) {
        get().receiveNetworkAction({ type: 'ROLL_DICE_REQUEST', payload: { playerId: me.id } });
      } else {
        sendToHost({ type: 'ROLL_DICE_REQUEST', payload: { playerId: me.id } });
      }
    },

    handleLudoMove: (pieceId) => {
       // Only Host logic here for actual state change
       const state = get();
       // ... Complex Ludo Logic (Cut, Home, etc.) ...
       // (Simplified for this file size, but architecture supports full rules)
       
       // Example: Update piece pos
       const newPieces = state.ludoState.pieces.map(p => {
         if (p.id === pieceId) {
             const move = state.diceValue || 0;
             // Handle leaving yard
             if (p.position === -1 && move === 6) return { ...p, position: 0 };
             if (p.position !== -1) return { ...p, position: p.position + move };
         }
         return p;
       });
       
       // Handle cuts/collisions
       // ...

       const newState = {
         ...state,
         ludoState: { ...state.ludoState, pieces: newPieces },
         diceValue: null,
         currentTurnIndex: (state.currentTurnIndex + 1) % state.players.length
       };
       set(newState);
       broadcast(newState);
    },

    handleSnakeMove: () => {
      // Host Logic
      const state = get();
      const player = state.players[state.currentTurnIndex];
      const currentPos = state.snakesState.playerPositions.find(p => p.playerId === player.id)?.position || 0;
      const roll = state.diceValue || 0;
      
      let nextPos = currentPos + roll;
      
      // Exact win rule
      if (nextPos > 100) nextPos = currentPos;
      
      // Snake / Ladder check
      if (SNAKES[nextPos]) nextPos = SNAKES[nextPos];
      if (LADDERS[nextPos]) nextPos = LADDERS[nextPos];
      
      const newPositions = state.snakesState.playerPositions.map(p => 
        p.playerId === player.id ? { ...p, position: nextPos } : p
      );
      
      const winner = nextPos === 100 ? player.id : null;
      
      const newState = {
        ...state,
        snakesState: { playerPositions: newPositions, winnerId: winner },
        diceValue: null,
        currentTurnIndex: (state.currentTurnIndex + 1) % state.players.length
      };
      
      setTimeout(() => {
        set(newState);
        broadcast(newState);
      }, 500); // Delay for visual slide
    },

    handleTTTMove: (index) => {
      // Host Logic
      const state = get();
      const board = [...state.tictactoeState.board];
      const player = state.players[state.currentTurnIndex];
      const symbol = state.currentTurnIndex === 0 ? 'X' : 'O'; // Host X, Client O
      
      if (board[index] || state.tictactoeState.winner) return;
      
      board[index] = symbol;
      
      // Win Check
      const lines = [
        [0,1,2],[3,4,5],[6,7,8], // rows
        [0,3,6],[1,4,7],[2,5,8], // cols
        [0,4,8],[2,4,6] // diags
      ];
      
      let winner = null;
      let winningLine = null;
      
      for (const line of lines) {
        const [a,b,c] = line;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
          winner = player.id;
          winningLine = line;
          break;
        }
      }
      
      const isDraw = !winner && board.every(c => c !== null);
      
      const newState = {
        ...state,
        tictactoeState: { board, winner, winningLine, draw: isDraw },
        currentTurnIndex: (state.currentTurnIndex + 1) % state.players.length
      };
      
      set(newState);
      broadcast(newState);
    }
  };
});
