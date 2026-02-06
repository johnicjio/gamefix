import { useState, useEffect } from 'react';
import { GameType } from '../types';
import Peer from 'peerjs';

interface GameLobbyProps {
  selectedGame: GameType | null;
  onGameSelect: (game: GameType) => void;
  onStartGame: (peerId: string, remotePeerId: string) => void;
}

const games = [
  {
    type: 'ludo' as GameType,
    name: 'Ludo',
    icon: '🎲',
    description: 'Classic board game with dice rolls and strategy',
    players: '2-4 Players'
  },
  {
    type: 'tictactoe' as GameType,
    name: 'Tic Tac Toe',
    icon: '❌⭕',
    description: 'Quick strategic game of X and O',
    players: '2 Players'
  },
  {
    type: 'rps' as GameType,
    name: 'Rock Paper Scissors',
    icon: '✊✋✌️',
    description: 'Best of 5 rounds classic hand game',
    players: '2 Players'
  },
  {
    type: 'snakeladders' as GameType,
    name: 'Snake & Ladders',
    icon: '🐍🪜',
    description: 'Race to the top avoiding snakes',
    players: '2-4 Players'
  }
];

function GameLobby({ selectedGame, onGameSelect, onStartGame }: GameLobbyProps) {
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      setMyPeerId(id);
      console.log('My peer ID:', id);
    });

    newPeer.on('error', (error) => {
      console.error('Peer error:', error);
      alert('Connection error: ' + error.message);
      setIsConnecting(false);
    });

    setPeer(newPeer);

    return () => {
      newPeer.destroy();
    };
  }, []);

  const handleConnect = () => {
    if (!peer || !remotePeerId || !selectedGame) {
      alert('Please select a game and enter opponent ID');
      return;
    }

    setIsConnecting(true);
    
    // Test connection
    const conn = peer.connect(remotePeerId);
    
    conn.on('open', () => {
      console.log('Connected to:', remotePeerId);
      onStartGame(myPeerId, remotePeerId);
    });

    conn.on('error', (error) => {
      console.error('Connection error:', error);
      alert('Failed to connect to opponent');
      setIsConnecting(false);
    });
  };

  return (
    <div className="game-lobby">
      <div className="lobby-header">
        <h1>🎮 GameFix Arena</h1>
        <p>Choose your game and connect with friends!</p>
      </div>

      <div className="games-grid">
        {games.map((game) => (
          <div
            key={game.type}
            className={`game-card ${selectedGame === game.type ? 'selected' : ''}`}
            onClick={() => onGameSelect(game.type)}
          >
            <span className="game-card-icon">{game.icon}</span>
            <h3>{game.name}</h3>
            <p>{game.description}</p>
            <div className="players">{game.players}</div>
          </div>
        ))}
      </div>

      {selectedGame && (
        <div className="connection-panel">
          <h2>Connect to Play</h2>
          
          <div className="peer-info">
            <label>Your Player ID (Share this with your friend):</label>
            <div className="peer-id-display">
              {myPeerId || 'Generating...'}
            </div>
          </div>

          <div className="input-group">
            <label>Enter Opponent's Player ID:</label>
            <input
              type="text"
              value={remotePeerId}
              onChange={(e) => setRemotePeerId(e.target.value)}
              placeholder="Paste opponent's ID here"
              disabled={isConnecting}
            />
          </div>

          <button
            className="btn btn-primary"
            onClick={handleConnect}
            disabled={!myPeerId || !remotePeerId || isConnecting}
          >
            {isConnecting ? 'Connecting...' : 'Start Game'}
          </button>
        </div>
      )}
    </div>
  );
}

export default GameLobby;