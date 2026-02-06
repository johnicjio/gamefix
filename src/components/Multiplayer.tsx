import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import Peer, { DataConnection } from 'peerjs';
import { useGameStore, type PlayerColor } from '../store/GameStore';

interface MultiplayerProps {
  onGameStart: () => void;
}

// Generate game ID
function generateGameId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'LUDO-';
  for (let i = 0; i < 3; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

export default function Multiplayer({ onGameStart }: MultiplayerProps) {
  const [gameId, setGameId] = useState('');
  const [joinId, setJoinId] = useState('');
  const [status, setStatus] = useState<'idle' | 'hosting' | 'joining' | 'connected'>('idle');
  
  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  
  const {
    setIsHost,
    setMyColor,
    setGameId: setStoreGameId,
    setConnected,
    setDiceValue,
    setCurrentTurn,
    movePiece,
    setPieces
  } = useGameStore();
  
  useEffect(() => {
    return () => {
      if (peerRef.current) {
        peerRef.current.destroy();
      }
    };
  }, []);
  
  const handleHost = () => {
    const id = generateGameId();
    setGameId(id);
    setStatus('hosting');
    
    const peer = new Peer(id);
    peerRef.current = peer;
    
    peer.on('open', () => {
      console.log('Host peer opened with ID:', id);
    });
    
    peer.on('connection', (conn) => {
      connectionRef.current = conn;
      setStatus('connected');
      setConnected(true);
      setIsHost(true);
      setMyColor('red');
      setStoreGameId(id);
      
      conn.on('data', handleData);
      
      // Send initial state
      conn.send({
        type: 'INIT',
        payload: { color: 'green' }
      });
    });
    
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setStatus('idle');
    });
  };
  
  const handleJoin = () => {
    if (!joinId) return;
    
    setStatus('joining');
    
    const peer = new Peer();
    peerRef.current = peer;
    
    peer.on('open', () => {
      const conn = peer.connect(joinId);
      connectionRef.current = conn;
      
      conn.on('open', () => {
        setStatus('connected');
        setConnected(true);
        setIsHost(false);
        setStoreGameId(joinId);
      });
      
      conn.on('data', handleData);
      
      conn.on('error', (err) => {
        console.error('Connection error:', err);
        setStatus('idle');
      });
    });
    
    peer.on('error', (err) => {
      console.error('Peer error:', err);
      setStatus('idle');
    });
  };
  
  const handleData = (data: any) => {
    switch (data.type) {
      case 'INIT':
        setMyColor(data.payload.color as PlayerColor);
        break;
      
      case 'ROLL_RESULT':
        setDiceValue(data.payload.value);
        break;
      
      case 'MOVE':
        movePiece(data.payload.pieceId, data.payload.steps);
        break;
      
      case 'TURN':
        setCurrentTurn(data.payload.color);
        break;
      
      case 'STATE_SYNC':
        setPieces(data.payload.pieces);
        setCurrentTurn(data.payload.currentTurn);
        break;
    }
  };
  
  const handleStartGame = () => {
    if (status === 'connected') {
      onGameStart();
    }
  };
  
  // Send data to peer
  useGameStore.subscribe((state) => {
    if (connectionRef.current && state.isHost) {
      // Host sends all updates
      connectionRef.current.send({
        type: 'STATE_SYNC',
        payload: {
          pieces: state.pieces,
          currentTurn: state.currentTurn
        }
      });
    }
  });
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-800 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full"
      >
        <motion.h1
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent"
        >
          🎲 Premium Ludo
        </motion.h1>
        <p className="text-gray-600 text-center mb-8">WebRTC Multiplayer Edition</p>
        
        {status === 'idle' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <button
              onClick={handleHost}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              💻 Host Game
            </button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">OR</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <input
                type="text"
                value={joinId}
                onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                placeholder="Enter Game ID (e.g., LUDO-ABC)"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-center font-mono text-lg"
              />
              <button
                onClick={handleJoin}
                disabled={!joinId}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                🔗 Join Game
              </button>
            </div>
          </motion.div>
        )}
        
        {status === 'hosting' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center space-y-4"
          >
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-300">
              <p className="text-gray-600 mb-3">Share this Game ID:</p>
              <div className="text-3xl font-bold text-green-600 font-mono tracking-wider">
                {gameId}
              </div>
            </div>
            <p className="text-gray-500 flex items-center justify-center gap-2">
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                ⏳
              </motion.span>
              Waiting for opponent...
            </p>
          </motion.div>
        )}
        
        {status === 'joining' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
              className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
            />
            <p className="text-gray-600">Connecting to game...</p>
          </motion.div>
        )}
        
        {status === 'connected' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600">Connected!</h2>
            <p className="text-gray-600">Ready to start the game</p>
            <button
              onClick={handleStartGame}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
            >
              🎮 Start Playing
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}