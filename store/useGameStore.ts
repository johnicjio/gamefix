import { create } from 'zustand';
import { 
  GameState, Player, GameType, MessageType, NetworkMessage, 
  TTTState, SnakesState, LudoState, InputPayload 
} from '../types';
import { networkManager } from '../net/NetworkManager';
import { INITIAL_TTT_STATE, processTTTMove } from '../engines/tictactoe';
import { INITIAL_SNAKES_STATE, processSnakesMove } from '../engines/snakes';
import { INITIAL_LUDO_STATE, initLudoPlayer, processLudoAction } from '../engines/ludo';
import { COLORS } from '../constants';

interface StoreState {
  gameState: GameState;
  myPlayerId: string | null;
  isConnected: boolean;
  statusMessage: string;
  
  // Actions
  initHost: () => Promise<string>;
  joinGame: (hostId: string) => Promise<void>;
  startGame: (type: GameType) => void;
  sendInput: (payload: InputPayload) => void;
  
  // Internal (Network Callbacks)
  _receiveMessage: (msg: NetworkMessage) => void;
  _addPlayer: (id: string) => void;
}

const INITIAL_STATE: GameState = {
  sessionId: '',
  hostId: '',
  activeGame: GameType.NONE,
  players: [],
  playerOrder: [],
  tictactoe: null,
  snakes: null,
  ludo: null,
  lastUpdated: Date.now(),
};

export const useGameStore = create<StoreState>((set, get) => ({
  gameState: INITIAL_STATE,
  myPlayerId: null,
  isConnected: false,
  statusMessage: 'Welcome to RetroVerse',

  initHost: async () => {
    try {
      set({ statusMessage: 'Initializing Host...' });
      const id = await networkManager.initialize();
      networkManager.isHost = true;
      
      const hostPlayer: Player = {
        id,
        name: 'Player 1 (Host)',
        color: COLORS[0],
        isHost: true,
        score: 0
      };

      const newState: GameState = {
        ...INITIAL_STATE,
        sessionId: crypto.randomUUID(),
        hostId: id,
        players: [hostPlayer],
        playerOrder: [id],
      };

      set({ 
        gameState: newState, 
        myPlayerId: id, 
        isConnected: true,
        statusMessage: `Room Created! ID: ${id}` 
      });
      
      // Setup Host Listeners
      networkManager.setConnectionHandler((conn) => {
        get()._addPlayer(conn.peer);
      });
      
      networkManager.setMessageHandler((msg) => get()._receiveMessage(msg));
      
      return id;
    } catch (e) {
      set({ statusMessage: 'Failed to init host' });
      throw e;
    }
  },

  joinGame: async (hostId: string) => {
    try {
      set({ statusMessage: `Connecting to ${hostId}...` });
      await networkManager.initialize(); // Init self first
      networkManager.connectToHost(hostId);
      
      networkManager.setMessageHandler((msg) => get()._receiveMessage(msg));
      
      // Wait for state sync
      set({ myPlayerId: networkManager.myId, isConnected: true, statusMessage: 'Waiting for Host...' });
      
      // Send Join Request
      networkManager.send({
        type: MessageType.JOIN_REQUEST,
        senderId: networkManager.myId,
        payload: { name: `Player ${Math.floor(Math.random() * 1000)}` },
        timestamp: Date.now()
      });
      
    } catch (e) {
      set({ statusMessage: 'Connection failed' });
    }
  },

  startGame: (type: GameType) => {
    const { gameState, myPlayerId } = get();
    if (!networkManager.isHost) return;

    let newState = { ...gameState, activeGame: type, lastUpdated: Date.now() };

    // Reset Specific Game State
    if (type === GameType.TIC_TAC_TOE) {
      newState.tictactoe = { ...INITIAL_TTT_STATE, currentTurn: gameState.playerOrder[0] };
    } else if (type === GameType.SNAKES_AND_LADDERS) {
      const startPos: Record<string, number> = {};
      gameState.players.forEach(p => startPos[p.id] = 1);
      newState.snakes = { ...INITIAL_SNAKES_STATE, positions: startPos, currentTurn: gameState.playerOrder[0] };
    } else if (type === GameType.LUDO) {
      const ludoPlayers: Record<string, any> = {};
      gameState.players.forEach(p => ludoPlayers[p.id] = initLudoPlayer());
      newState.ludo = { ...INITIAL_LUDO_STATE, players: ludoPlayers, currentTurn: gameState.playerOrder[0] };
    }

    set({ gameState: newState });
    get()._broadcastState(newState);
  },

  sendInput: (payload: InputPayload) => {
    const { gameState, myPlayerId } = get();
    if (!myPlayerId) return;

    // Optimistic UI could happen here for some things, but strict authoritative means we send intent.
    // If Host, we process immediately.
    if (networkManager.isHost) {
      get()._processInput(myPlayerId, payload);
    } else {
      networkManager.send({
        type: MessageType.PLAYER_INPUT,
        senderId: myPlayerId,
        payload,
        timestamp: Date.now()
      });
    }
  },

  _addPlayer: (id: string) => {
    const { gameState } = get();
    if (gameState.players.find(p => p.id === id)) return;

    const newPlayer: Player = {
      id,
      name: `Player ${gameState.players.length + 1}`,
      color: COLORS[gameState.players.length % COLORS.length],
      isHost: false,
      score: 0
    };

    const newState = {
      ...gameState,
      players: [...gameState.players, newPlayer],
      playerOrder: [...gameState.playerOrder, id],
      lastUpdated: Date.now()
    };

    set({ gameState: newState });
    get()._broadcastState(newState);
  },

  _receiveMessage: (msg: NetworkMessage) => {
    const { gameState } = get();
    
    // Client Logic
    if (!networkManager.isHost) {
      if (msg.type === MessageType.STATE_UPDATE) {
        set({ gameState: msg.payload, statusMessage: 'Connected' });
      }
      return;
    }

    // Host Logic
    if (msg.type === MessageType.JOIN_REQUEST) {
      get()._addPlayer(msg.senderId);
    } else if (msg.type === MessageType.PLAYER_INPUT) {
      get()._processInput(msg.senderId, msg.payload);
    }
  },

  // HOST ONLY
  _processInput: (playerId: string, input: InputPayload) => {
    const { gameState } = get();
    let newState = { ...gameState };
    const playerIds = gameState.playerOrder;

    if (input.game === GameType.TIC_TAC_TOE && newState.tictactoe) {
      newState.tictactoe = processTTTMove(newState.tictactoe, playerId, input.data.cellIndex, playerIds);
    } 
    else if (input.game === GameType.SNAKES_AND_LADDERS && newState.snakes) {
      if (input.action === 'ROLL') {
        const roll = Math.floor(Math.random() * 6) + 1;
        newState.snakes = processSnakesMove(newState.snakes, playerId, roll, playerIds);
      }
    }
    else if (input.game === GameType.LUDO && newState.ludo) {
      // Inject randomness for Host
      let data = input.data || {};
      if (input.action === 'ROLL') {
        data = { roll: Math.floor(Math.random() * 6) + 1 };
      }
      newState.ludo = processLudoAction(newState.ludo, playerId, input.action as any, data, playerIds);
    }

    newState.lastUpdated = Date.now();
    set({ gameState: newState });
    get()._broadcastState(newState);
  },

  // HOST ONLY
  _broadcastState: (state: GameState) => {
    networkManager.send({
      type: MessageType.STATE_UPDATE,
      senderId: networkManager.myId,
      payload: state,
      timestamp: Date.now()
    });
  }
}));
