
import React, { useState, useEffect, useRef } from 'react';
import { GameType, GameProps, NetworkManager, NetworkPayload } from './types';
import LudoGame from './components/ludo/LudoGame';
import SnakeLadderGame from './components/coop/SnakeLadderGame';
import TicTacToeGame from './components/tictactoe/TicTacToeGame';
import RockPaperScissorsGame from './components/rps/RockPaperScissorsGame';
import WelcomeScreen from './components/WelcomeScreen';
import EndScreen from './components/EndScreen';
import { Gamepad2, ArrowLeft, Loader2, Cpu, Zap, Wifi, WifiOff } from 'lucide-react';
import { peerService } from './services/peerService';

// Dynamic mapping of GameType to Component
const GAME_COMPONENTS: Partial<Record<GameType, React.FC<GameProps>>> = {
  [GameType.LUDO]: LudoGame,
  [GameType.SNAKE]: SnakeLadderGame,
  [GameType.TIC_TAC_TOE]: TicTacToeGame,
  [GameType.ROCK_PAPER_SCISSORS]: RockPaperScissorsGame,
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
      
      <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-2 font-pixel text-center">
        System Init
      </h2>
      
      <div className="w-full bg-gray-900 rounded-full h-3 mb-4 border border-gray-800 overflow-hidden relative shadow-inner">
         <div 
            className="h-full bg-gradient-to-r from-indigo-600 to-purple-500 transition-all duration-300 ease-out relative" 
            style={{ width: `${progress}%` }}
         >
            <div className="absolute inset-0 bg-white/30 animate-[shimmer_1s_infinite] w-full" style={{ backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)', backgroundSize: '200% 100%' }} />
         </div>
      </div>
      
      <div className="flex items-center gap-3">
        <Cpu size={14} className="text-indigo-400 animate-pulse" />
        <p className="text-xs font-bold text-indigo-300 uppercase tracking-[0.2em] animate-in fade-in slide-in-from-bottom-2 key={message}">
            {message}
        </p>
      </div>
      
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  </div>
);

const App: React.FC = () => {
  const [phase, setPhase] = useState<'WELCOME' | 'LOADING' | 'GAME' | 'END'>('WELCOME');
  const [selectedGame, setSelectedGame] = useState<GameType>(GameType.LUDO);
  const [playerName, setPlayerName] = useState('');
  const [winner, setWinner] = useState('');
  
  // Loading State
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Networking State
  const [networkRole, setNetworkRole] = useState<'HOST' | 'GUEST' | 'OFFLINE'>('OFFLINE');
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [connectedPeerId, setConnectedPeerId] = useState<string>('');
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [guestJoined, setGuestJoined] = useState(false);

  // Refs for network callbacks to avoid closure staleness
  const stateUpdateCallbackRef = useRef<((state: any) => void) | null>(null);
  const actionReceivedCallbackRef = useRef<((actionType: string, payload: any, senderId: string) => void) | null>(null);

  // --- 1. Network Initialization ---
  useEffect(() => {
    // Initialize Peer on Mount
    peerService.init().then(id => {
      setMyPeerId(id);
      console.log("My Peer ID:", id);
    }).catch(err => console.error("Peer init failed", err));

    // Setup Listeners
    peerService.onPeerConnected = (peerId) => {
        setIsPeerConnected(true);
        setConnectedPeerId(peerId);
        setGuestJoined(true); // For host UI
    };

    peerService.onPeerDisconnected = () => {
        setIsPeerConnected(false);
        setConnectedPeerId('');
        setGuestJoined(false);
        // Optional: Reset game or show alert
    };

    peerService.onData = (data: NetworkPayload, senderId: string) => {
        if (data.type === 'STATE_SYNC') {
            if (stateUpdateCallbackRef.current) {
                stateUpdateCallbackRef.current(data.data);
            }
        } else if (data.type === 'ACTION') {
            if (actionReceivedCallbackRef.current) {
                actionReceivedCallbackRef.current(data.data.actionType, data.data.payload, senderId);
            }
        } else if (data.type === 'HANDSHAKE') {
            // Handshake for game selection sync
            if (data.data.selectedGame) {
                setSelectedGame(data.data.selectedGame);
                // Automatically transition guest to loading if host started
                if (data.data.phase === 'LOADING' || data.data.phase === 'GAME') {
                     handleSelectGame(data.data.selectedGame, true);
                }
            }
        }
    };

    return () => {
        peerService.cleanup();
    };
  }, []);

  // --- 2. Network Manager Implementation ---
  const networkManager: NetworkManager = {
      role: networkRole,
      myId: myPeerId,
      hostId: networkRole === 'GUEST' ? connectedPeerId : undefined,
      isConnected: isPeerConnected,
      
      // Send Action (Guest -> Host)
      sendAction: (actionType, payload) => {
          if (networkRole === 'OFFLINE') return;
          const data: NetworkPayload = {
              type: 'ACTION',
              data: { actionType, payload },
              timestamp: Date.now()
          };
          peerService.send(data);
      },

      // Broadcast State (Host -> Guest)
      broadcastState: (state) => {
          if (networkRole !== 'HOST') return;
          const data: NetworkPayload = {
              type: 'STATE_SYNC',
              data: state,
              timestamp: Date.now()
          };
          peerService.send(data);
      },

      // Register Listeners
      onStateUpdate: (cb) => { stateUpdateCallbackRef.current = cb; },
      onActionReceived: (cb) => { actionReceivedCallbackRef.current = cb; }
  };

  // --- 3. UI Handlers ---

  const handleCreateRoom = () => {
      setNetworkRole('HOST');
      // Already initialized in useEffect, just need to wait for guest
  };

  const handleJoinRoom = (hostId: string) => {
      setNetworkRole('GUEST');
      setConnectedPeerId(hostId);
      peerService.connect(hostId);
  };

  const handleGameEnd = (winnerName: string) => {
    setWinner(winnerName);
    setPhase('END');
  };

  const handleSelectGame = (type: GameType, isRemoteTrigger = false) => {
    // If Host, broadcast selection
    if (networkRole === 'HOST' && !isRemoteTrigger) {
        peerService.send({ 
            type: 'HANDSHAKE', 
            data: { selectedGame: type, phase: 'LOADING' } 
        });
    }

    setPhase('LOADING');
    setLoadingProgress(0);
    
    // Simulate a robust loading sequence
    const steps = [
        { msg: "Establishing Connection...", t: 0, p: 10 },
        { msg: "Loading Assets & Textures...", t: 800, p: 40 },
        { msg: "Calibrating Physics Engine...", t: 1600, p: 70 },
        { msg: "Summoning AI Opponents...", t: 2400, p: 90 },
        { msg: "Ready!", t: 3000, p: 100 }
    ];

    let currentStep = 0;
    
    const runStep = () => {
        if (currentStep >= steps.length) {
            setSelectedGame(type);
            setPhase('GAME');
            return;
        }
        
        const step = steps[currentStep];
        setLoadingMessage(step.msg);
        setLoadingProgress(step.p);
        
        currentStep++;
        if (currentStep < steps.length) {
            setTimeout(runStep, steps[currentStep].t - (currentStep > 0 ? steps[currentStep-1].t : 0));
        } else {
            setTimeout(runStep, 500); // Small delay on "Ready"
        }
    };
    
    runStep();
  };

  const resetToMenu = () => {
    setPhase('WELCOME');
    // Keep connection alive if multiplayer
  };

  const renderGame = () => {
    const GameComponent = GAME_COMPONENTS[selectedGame] || LudoGame;
    return <GameComponent 
        playerName={playerName} 
        onGameEnd={handleGameEnd} 
        network={networkManager}
    />;
  };

  // Initial Name Entry
  if (!playerName) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6 selection:bg-indigo-500">
        <div className="bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl w-full max-w-md text-center animate-in zoom-in duration-500">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-xl shadow-indigo-500/20 rotate-3">
            <Gamepad2 className="text-white" size={40} />
          </div>
          <h1 className="text-4xl font-black text-white mb-3 tracking-tighter uppercase font-pixel">DUO ARENA</h1>
          <p className="text-gray-500 mb-8 text-[10px] font-bold uppercase tracking-[0.4em]">Simple • Premium • Fun</p>
          <input 
            autoFocus
            className="w-full bg-gray-800 border-2 border-gray-700 text-white px-6 py-4 rounded-2xl mb-6 text-center font-bold focus:border-indigo-500 outline-none transition-all placeholder-gray-600"
            placeholder="ENTER YOUR NAME"
            maxLength={12}
            onKeyDown={(e) => { 
              if(e.key === 'Enter') {
                const val = (e.target as HTMLInputElement).value.trim();
                setPlayerName(val || 'Player 1');
              }
            }}
          />
          <button 
            onClick={(e) => {
                const input = (e.currentTarget.parentElement as HTMLElement).querySelector('input');
                setPlayerName(input?.value.trim() || 'Player 1');
            }}
            className="w-full bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition-colors shadow-lg active:scale-95"
          >
            START PLAYING
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {/* Network Status Indicator */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          {networkRole !== 'OFFLINE' && (
              <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-lg backdrop-blur-md
                  ${isPeerConnected ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-yellow-500/10 border-yellow-500 text-yellow-400'}
              `}>
                  {isPeerConnected ? <Wifi size={12}/> : <WifiOff size={12} className="animate-pulse"/>}
                  {networkRole} MODE: {isPeerConnected ? 'ONLINE' : 'SEARCHING...'}
              </div>
          )}
      </div>

      {phase === 'WELCOME' && (
        <WelcomeScreen 
          onSelectGame={handleSelectGame} 
          isHost={networkRole === 'HOST'}
          playerName={playerName} 
          roomCode={myPeerId}
          networkRole={networkRole}
          guestJoined={guestJoined}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          connectedCount={isPeerConnected ? 2 : 1}
        />
      )}

      {phase === 'LOADING' && (
         <LoadingScreen message={loadingMessage} progress={loadingProgress} />
      )}

      {phase === 'GAME' && (
        <div className="p-4 md:p-10 animate-in zoom-in duration-500">
          <div className="max-w-7xl mx-auto">
            <button 
              onClick={resetToMenu}
              className="mb-8 px-6 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black hover:bg-gray-800 transition-colors uppercase tracking-widest flex items-center gap-2 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Menu
            </button>
            {renderGame()}
          </div>
        </div>
      )}

      {phase === 'END' && (
        <EndScreen 
          winnerName={winner} 
          isHost={networkRole === 'HOST' || networkRole === 'OFFLINE'} 
          gameType={selectedGame}
          onReset={resetToMenu}
          onRestart={() => setPhase('GAME')}
        />
      )}
    </div>
  );
};

export default App;
