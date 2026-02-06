
import React, { useState, useEffect, useRef } from 'react';
import { GameType, GameProps, NetworkManager, NetworkPayload } from './types';
import LudoGame from './components/ludo/LudoGame';
import TicTacToeGame from './components/tictactoe/TicTacToeGame';
import WelcomeScreen from './components/WelcomeScreen';
import EndScreen from './components/EndScreen';
import { ArrowLeft, Loader2, Cpu, Wifi, WifiOff } from 'lucide-react';
import { peerService } from './services/peerService';

/**
 * A simple routing map for the games.
 * We focus on Ludo and Tic Tac Toe for simplicity as requested.
 */
const GAME_COMPONENTS: Partial<Record<GameType, React.FC<GameProps>>> = {
  [GameType.LUDO]: LudoGame,
  [GameType.TIC_TAC_TOE]: TicTacToeGame,
};

const LoadingScreen = ({ message, progress }: { message: string; progress: number }) => (
  <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 relative overflow-hidden animate-in fade-in duration-300">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#312e81_0%,#030712_70%)] opacity-40 animate-pulse" />
    <div className="relative z-10 flex flex-col items-center w-full max-w-md">
      <div className="relative mb-10">
         <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse rounded-full" />
         <div className="relative bg-gray-900/50 p-6 rounded-3xl border border-indigo-500/30 backdrop-blur-xl shadow-2xl">
            <Loader2 size={48} className="text-indigo-400 animate-spin" />
         </div>
      </div>
      <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2 font-pixel text-center">Initialising</h2>
      <div className="w-full bg-gray-900 rounded-full h-3 mb-4 border border-gray-800 overflow-hidden relative shadow-inner">
         <div 
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-300 ease-out" 
            style={{ width: `${progress}%` }}
         />
      </div>
      <div className="flex items-center gap-3">
        <Cpu size={14} className="text-indigo-400 animate-pulse" />
        <p className="text-xs font-bold text-indigo-300 uppercase tracking-[0.2em]">{message}</p>
      </div>
    </div>
  </div>
);

const App: React.FC = () => {
  // Phase state manages the main routing: Welcome -> Loading -> Game -> End
  const [phase, setPhase] = useState<'WELCOME' | 'LOADING' | 'GAME' | 'END'>('WELCOME');
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [winner, setWinner] = useState('');
  
  // Loading states for visual transitions
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Networking state for multiplayer sync
  const [networkRole, setNetworkRole] = useState<'HOST' | 'GUEST' | 'OFFLINE'>('OFFLINE');
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [connectedPeerId, setConnectedPeerId] = useState<string>('');
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [guestJoined, setGuestJoined] = useState(false);

  // Refs for network callbacks to avoid closure staleness in event listeners
  const stateUpdateCallbackRef = useRef<((state: any) => void) | null>(null);
  const actionReceivedCallbackRef = useRef<((actionType: string, payload: any, senderId: string) => void) | null>(null);

  /**
   * Simple loading transition before entering a game
   */
  const startLoadingSequence = (targetGame: GameType) => {
    setSelectedGame(targetGame);
    setPhase('LOADING');
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 20;
      if (progress >= 100) {
        setLoadingProgress(100);
        setLoadingMessage("Ready!");
        clearInterval(interval);
        setTimeout(() => setPhase('GAME'), 500);
      } else {
        setLoadingProgress(progress);
        const msgs = ["Handshaking...", "Syncing Assets...", "Readying Players...", "Optimising Viewport..."];
        setLoadingMessage(msgs[Math.floor(progress / 25)] || "Finalising...");
      }
    }, 150);
  };

  useEffect(() => {
    // Initialise PeerJS for P2P multiplayer
    peerService.init().then(id => setMyPeerId(id));

    peerService.onPeerConnected = (id) => {
      setIsPeerConnected(true);
      setConnectedPeerId(id);
      setGuestJoined(true);
    };

    peerService.onData = (payload: NetworkPayload) => {
      if (payload.type === 'HANDSHAKE' && payload.data.command === 'SWITCH_GAME') {
        startLoadingSequence(payload.data.gameType);
      } else if (payload.type === 'STATE_SYNC') {
        stateUpdateCallbackRef.current?.(payload.data);
      } else if (payload.type === 'ACTION') {
        actionReceivedCallbackRef.current?.(payload.data.actionType, payload.data.payload, payload.senderId || '');
      }
    };

    return () => peerService.cleanup();
  }, []);

  /**
   * Network Manager object passed to game components for communication
   */
  const networkManager: NetworkManager = {
    role: networkRole,
    myId: myPeerId,
    hostId: connectedPeerId,
    isConnected: isPeerConnected,
    sendAction: (actionType, payload) => {
      peerService.send({ type: 'ACTION', data: { actionType, payload }, senderId: myPeerId });
    },
    broadcastState: (state) => {
      if (networkRole === 'HOST') peerService.send({ type: 'STATE_SYNC', data: state });
    },
    onStateUpdate: (cb) => { stateUpdateCallbackRef.current = cb; },
    onActionReceived: (cb) => { actionReceivedCallbackRef.current = cb; }
  };

  const handleSelectGame = (type: GameType) => {
    if (networkRole === 'HOST') {
      peerService.send({ type: 'HANDSHAKE', data: { command: 'SWITCH_GAME', gameType: type } });
    }
    startLoadingSequence(type);
  };

  const handleGameEnd = (winnerName: string) => {
    setWinner(winnerName);
    setPhase('END');
  };

  // Resets the state to the game selection menu
  const resetToMenu = () => {
    setPhase('WELCOME');
    setSelectedGame(null);
  };

  // Login Screen if no player name is set
  if (!playerName) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl w-full max-w-md text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-indigo-500/20 shadow-xl">
             <Cpu className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-white mb-8 tracking-tighter uppercase font-pixel">Game Arena</h1>
          <input 
            className="w-full bg-gray-800 border-2 border-gray-700 text-white px-6 py-4 rounded-2xl mb-6 text-center font-bold focus:border-indigo-500 outline-none transition-all"
            placeholder="ENTER YOUR NAME"
            maxLength={12}
            onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && playerName && setPlayerName(playerName)}
          />
          <button 
            disabled={!playerName}
            onClick={() => setPlayerName(playerName)} 
            className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            ENTER ARENA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Network Status Overlay */}
      <div className="fixed top-4 right-4 z-50">
        {networkRole !== 'OFFLINE' && (
          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-lg backdrop-blur-md ${isPeerConnected ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-yellow-500/10 border-yellow-500 text-yellow-400'}`}>
            {isPeerConnected ? <Wifi size={12}/> : <WifiOff size={12} className="animate-pulse"/>}
            {networkRole}: {isPeerConnected ? 'ONLINE' : 'SEARCHING...'}
          </div>
        )}
      </div>

      {/* Main Routing Logic */}
      {phase === 'WELCOME' && (
        <WelcomeScreen 
          onSelectGame={handleSelectGame} 
          isHost={networkRole === 'HOST'}
          playerName={playerName} 
          roomCode={myPeerId}
          networkRole={networkRole}
          guestJoined={guestJoined}
          onCreateRoom={() => setNetworkRole('HOST')}
          onJoinRoom={(id) => { setNetworkRole('GUEST'); peerService.connect(id); }}
          connectedCount={isPeerConnected ? 2 : 1}
        />
      )}

      {phase === 'LOADING' && (
        <LoadingScreen message={loadingMessage} progress={loadingProgress} />
      )}

      {phase === 'GAME' && selectedGame && (
        <div className="p-4 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="max-w-6xl mx-auto">
            <button 
              onClick={resetToMenu} 
              className="mb-8 px-6 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black flex items-center gap-2 hover:bg-gray-800 transition-colors uppercase tracking-widest"
            >
              <ArrowLeft size={16} /> Back to Menu
            </button>
            {GAME_COMPONENTS[selectedGame]?.({ 
              playerName, 
              onGameEnd: handleGameEnd, 
              network: networkManager 
            })}
          </div>
        </div>
      )}

      {phase === 'END' && selectedGame && (
        <EndScreen 
          winnerName={winner} 
          isHost={networkRole === 'HOST' || networkRole === 'OFFLINE'} 
          gameType={selectedGame} 
          onReset={resetToMenu} 
          onRestart={() => startLoadingSequence(selectedGame)} 
        />
      )}
    </div>
  );
};

export default App;
