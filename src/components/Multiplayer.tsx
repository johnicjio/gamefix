import { useEffect, useRef, useState } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { useGameStore, type PlayerColor } from '../store';
import './Multiplayer.css';

interface MultiplayerProps {
  onGameStart: () => void;
}

export function Multiplayer({ onGameStart }: MultiplayerProps) {
  const [peerId, setPeerId] = useState('');
  const [remotePeerId, setRemotePeerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [connected, setConnected] = useState(false);
  const peerRef = useRef<Peer | null>(null);
  const connectionRef = useRef<DataConnection | null>(null);
  
  const {
    setMyColor,
    setIsHost: setStoreIsHost,
    setDiceValue,
    setCurrentTurn,
    movePiece,
    setCanRoll
  } = useGameStore();
  
  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;
    
    peer.on('open', (id) => {
      setPeerId(id);
    });
    
    peer.on('connection', (conn) => {
      connectionRef.current = conn;
      setConnected(true);
      setIsHost(true);
      setStoreIsHost(true);
      setMyColor('red');
      
      conn.on('data', handleData);
      
      // Send initial state to client
      conn.send({ type: 'INIT', color: 'green' });
    });
    
    return () => {
      peer.destroy();
    };
  }, []);
  
  const handleData = (data: any) => {
    switch (data.type) {
      case 'INIT':
        setMyColor(data.color as PlayerColor);
        break;
      case 'ROLL':
        setDiceValue(data.value);
        break;
      case 'MOVE':
        movePiece(data.pieceId, data.targetPosition);
        break;
      case 'TURN':
        setCurrentTurn(data.color);
        setCanRoll(true);
        break;
    }
  };
  
  const handleConnect = () => {
    if (!peerRef.current || !remotePeerId) return;
    
    const conn = peerRef.current.connect(remotePeerId);
    connectionRef.current = conn;
    
    conn.on('open', () => {
      setConnected(true);
      setIsHost(false);
      setStoreIsHost(false);
    });
    
    conn.on('data', handleData);
  };
  
  const handleStart = () => {
    if (connected) {
      onGameStart();
    }
  };
  
  return (
    <div className="multiplayer-lobby">
      <div className="lobby-card">
        <h1>🎲 3D Ludo King</h1>
        <p className="subtitle">WebGL Multiplayer Edition</p>
        
        <div className="connection-section">
          <div className="peer-id-section">
            <label>Your Player ID:</label>
            <div className="peer-id">{peerId || 'Generating...'}</div>
            <p className="hint">Share this ID with your friend</p>
          </div>
          
          <div className="divider">OR</div>
          
          <div className="connect-section">
            <label>Enter Friend's ID:</label>
            <input
              type="text"
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
              placeholder="Paste friend's ID"
              disabled={connected}
            />
            <button
              onClick={handleConnect}
              disabled={!remotePeerId || connected}
              className="btn-connect"
            >
              {connected ? 'Connected ✓' : 'Connect'}
            </button>
          </div>
        </div>
        
        {connected && (
          <div className="ready-section">
            <div className="status">✓ Connected</div>
            <div className="role">
              You are: {isHost ? 'Red (Host)' : 'Green (Client)'}
            </div>
            <button onClick={handleStart} className="btn-start">
              Start Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}