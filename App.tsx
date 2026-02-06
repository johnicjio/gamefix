
import React, { useState, useEffect, useRef } from 'react';
import { GameType, GameProps, NetworkManager, NetworkPayload } from './types';
import LudoGame from './components/ludo/LudoGame';
import TicTacToeGame from './components/tictactoe/TicTacToeGame';
import RockPaperScissorsGame from './components/rps/RockPaperScissorsGame';
import SnakeLadderGame from './components/coop/SnakeLadderGame';
import CarromGame from './components/carrom/CarromGame';
import BrawlerGame from './components/brawler/BrawlerGame';
import CandyLandGame from './components/candyland/CandyLandGame';
import NeonCrushGame from './components/crush/NeonCrushGame';
import WelcomeScreen from './components/WelcomeScreen';
import EndScreen from './components/EndScreen';
import { ArrowLeft, Wifi, WifiOff, RefreshCcw, UserCircle, AlertCircle } from 'lucide-react';
import { peerService } from './services/peerService';

const GAME_COMPONENTS: Record<GameType, React.FC<GameProps>> = {
  [GameType.LUDO]: LudoGame,
  [GameType.SNAKE]: SnakeLadderGame,
  [GameType.TIC_TAC_TOE]: TicTacToeGame,
  [GameType.ROCK_PAPER_SCISSORS]: RockPaperScissorsGame,
  [GameType.CARROM]: CarromGame,
  [GameType.BRAWLER]: BrawlerGame,
  [GameType.CANDY_LAND]: CandyLandGame,
  [GameType.NEON_CRUSH]: NeonCrushGame,
};

const App: React.FC = () => {
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('arena_player_name') || '');
  const [isNameSet, setIsNameSet] = useState(!!playerName);
  const [phase, setPhase] = useState<'WELCOME' | 'LOADING' | 'GAME' | 'END'>('WELCOME');
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [winner, setWinner] = useState('');
  const [networkRole, setNetworkRole] = useState<'HOST' | 'GUEST' | 'OFFLINE'>('OFFLINE');
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [signalingStatus, setSignalingStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING' | 'ERROR'>('CONNECTED');

  const stateUpdateCallbackRef = useRef<((state: any) => void) | null>(null);
  const actionReceivedCallbackRef = useRef<((actionType: string, payload: any, senderId: string) => void) | null>(null);

  useEffect(() => {
    if (!isNameSet || !playerName) return;

    peerService.init(playerName).then(id => {
      setMyPeerId(id);
      setSignalingStatus('CONNECTED');
    }).catch(() => setSignalingStatus('ERROR'));

    peerService.onSignalingStateChange = (status) => {
      setSignalingStatus(status);
      if (status === 'CONNECTED') setMyPeerId(peerService.myId);
    };

    peerService.onPeerConnected = () => setIsPeerConnected(true);
    peerService.onPeerDisconnected = () => setIsPeerConnected(false);

    peerService.onData = (payload: NetworkPayload, senderId: string) => {
      if (payload.type === 'HANDSHAKE' && payload.data.command === 'SWITCH_GAME') {
        setSelectedGame(payload.data.gameType);
        setPhase('GAME');
      } else if (payload.type === 'STATE_SYNC') {
        stateUpdateCallbackRef.current?.(payload.data);
      } else if (payload.type === 'ACTION') {
        actionReceivedCallbackRef.current?.(payload.data.actionType, payload.data.payload, senderId);
      }
    };

    return () => {
      peerService.cleanup();
    };
  }, [isNameSet, playerName]);

  const networkManager: NetworkManager = {
    role: networkRole,
    myId: myPeerId,
    isConnected: isPeerConnected,
    sendAction: (actionType: string, payload?: any) => {
      peerService.send({ type: 'ACTION', data: { actionType, payload }, senderId: myPeerId });
    },
    broadcastState: (state) => {
      if (networkRole === 'HOST') peerService.send({ type: 'STATE_SYNC', data: state });
    },
    onStateUpdate: (cb) => { stateUpdateCallbackRef.current = cb; },
    onActionReceived: (cb) => { actionReceivedCallbackRef.current = cb; }
  };

  const handleStartGame = (type: GameType) => {
    if (networkRole === 'HOST') {
      peerService.send({ type: 'HANDSHAKE', data: { command: 'SWITCH_GAME', gameType: type } });
    }
    setSelectedGame(type);
    setPhase('GAME');
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans">
      {!isNameSet ? (
        <div className="min-h-screen flex items-center justify-center p-6 animate-in zoom-in">
          <div className="bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl w-full max-w-md text-center">
            <UserCircle className="mx-auto text-indigo-500 mb-6" size={64} />
            <h1 className="text-3xl font-black text-white mb-8 tracking-tighter uppercase font-pixel italic">Arena Profile</h1>
            <input 
              autoFocus
              className="w-full bg-gray-800 border-2 border-gray-700 text-white px-6 py-4 rounded-2xl mb-6 text-center font-bold focus:border-indigo-500 outline-none transition-all"
              placeholder="ENTER CODENAME"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
            />
            <button 
              disabled={!playerName.trim()}
              onClick={() => {
                  localStorage.setItem('arena_player_name', playerName);
                  setIsNameSet(true);
              }} 
              className="w-full bg-white text-black font-black py-4 rounded-2xl shadow-xl hover:bg-gray-200 active:scale-95 transition-all"
            >
              CONFIRM IDENTITY
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="fixed top-4 right-4 z-[100] flex flex-col items-end gap-2">
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-lg backdrop-blur-md transition-colors ${isPeerConnected ? 'bg-green-500/10 border-green-500 text-green-400' : 'bg-gray-800 border-white/10 text-gray-500'}`}>
              {isPeerConnected ? <Wifi size={12}/> : <WifiOff size={12}/>}
              {isPeerConnected ? 'SYNCED' : 'SOLO MODE'}
            </div>
            {signalingStatus !== 'CONNECTED' && (
              <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border shadow-lg backdrop-blur-md bg-amber-500/10 border-amber-500 text-amber-400">
                <RefreshCcw size={12} className="animate-spin" /> {signalingStatus}
              </div>
            )}
          </div>

          {phase === 'WELCOME' && (
            <WelcomeScreen 
              onSelectGame={handleStartGame}
              isHost={networkRole === 'HOST'}
              connectedCount={isPeerConnected ? 2 : 1}
              playerName={playerName}
              roomCode={myPeerId}
              networkRole={networkRole}
              guestJoined={isPeerConnected}
              onCreateRoom={() => setNetworkRole('HOST')}
              onJoinRoom={(id) => {
                  setNetworkRole('GUEST');
                  peerService.connect(id);
              }}
            />
          )}

          {phase === 'GAME' && selectedGame && (
            <div className="p-4 sm:p-8">
              <button onClick={() => setPhase('WELCOME')} className="mb-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={20} /> Back to Lobby
              </button>
              {React.createElement(GAME_COMPONENTS[selectedGame], {
                playerName,
                onGameEnd: (w) => { setWinner(w); setPhase('END'); },
                network: networkManager
              })}
            </div>
          )}

          {phase === 'END' && selectedGame && (
            <EndScreen 
              winnerName={winner}
              isHost={networkRole === 'HOST' || networkRole === 'OFFLINE'}
              onReset={() => setPhase('WELCOME')}
              onRestart={() => setPhase('GAME')}
              gameType={selectedGame}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
