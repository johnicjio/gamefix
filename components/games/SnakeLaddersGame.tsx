import { useState, useEffect } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { SnakeLaddersGameState, SnakeLadder } from '../../types';
import './SnakeLadders.css';

interface SnakeLaddersGameProps {
  peerId: string;
  remotePeerId: string;
  onExit: () => void;
}

const snakesAndLadders: SnakeLadder[] = [
  // Ladders
  { from: 4, to: 14, type: 'ladder' },
  { from: 9, to: 31, type: 'ladder' },
  { from: 20, to: 38, type: 'ladder' },
  { from: 28, to: 84, type: 'ladder' },
  { from: 40, to: 59, type: 'ladder' },
  { from: 51, to: 67, type: 'ladder' },
  { from: 63, to: 81, type: 'ladder' },
  { from: 71, to: 91, type: 'ladder' },
  // Snakes
  { from: 17, to: 7, type: 'snake' },
  { from: 54, to: 34, type: 'snake' },
  { from: 62, to: 19, type: 'snake' },
  { from: 64, to: 60, type: 'snake' },
  { from: 87, to: 24, type: 'snake' },
  { from: 93, to: 73, type: 'snake' },
  { from: 95, to: 75, type: 'snake' },
  { from: 99, to: 78, type: 'snake' }
];

const playerColors = ['#ef4444', '#3b82f6'];

const initialState: SnakeLaddersGameState = {
  players: [
    { position: 0, color: playerColors[0] },
    { position: 0, color: playerColors[1] }
  ],
  currentPlayer: 0,
  diceValue: null,
  winner: null,
  canRollDice: true
};

function SnakeLaddersGame({ peerId, remotePeerId, onExit }: SnakeLaddersGameProps) {
  const [gameState, setGameState] = useState<SnakeLaddersGameState>(initialState);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [isRolling, setIsRolling] = useState(false);

  useEffect(() => {
    const newPeer = new Peer(peerId);
    setPeer(newPeer);

    newPeer.on('open', () => {
      const conn = newPeer.connect(remotePeerId);
      setConnection(conn);
      setMyPlayerIndex(0);

      conn.on('data', (data: any) => {
        if (data.type === 'gameState') {
          setGameState(data.state);
        }
      });
    });

    newPeer.on('connection', (conn) => {
      setConnection(conn);
      setMyPlayerIndex(1);

      conn.on('data', (data: any) => {
        if (data.type === 'gameState') {
          setGameState(data.state);
        }
      });
    });

    return () => {
      newPeer.destroy();
    };
  }, [peerId, remotePeerId]);

  const checkSnakeOrLadder = (position: number): number => {
    const snakeOrLadder = snakesAndLadders.find(sl => sl.from === position);
    return snakeOrLadder ? snakeOrLadder.to : position;
  };

  const rollDice = () => {
    if (!gameState.canRollDice || gameState.currentPlayer !== myPlayerIndex || gameState.winner !== null) return;

    setIsRolling(true);
    const roll = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
      const newPlayers = [...gameState.players];
      let newPosition = newPlayers[myPlayerIndex].position + roll;

      // Check if won
      if (newPosition >= 100) {
        newPosition = 100;
        newPlayers[myPlayerIndex].position = newPosition;
        
        const newState = {
          ...gameState,
          players: newPlayers,
          diceValue: roll,
          winner: myPlayerIndex,
          canRollDice: false
        };

        setGameState(newState);
        if (connection) {
          connection.send({ type: 'gameState', state: newState });
        }
        setIsRolling(false);
        return;
      }

      // Check for snake or ladder
      const finalPosition = checkSnakeOrLadder(newPosition);
      newPlayers[myPlayerIndex].position = finalPosition;

      const newState = {
        players: newPlayers,
        currentPlayer: (gameState.currentPlayer + 1) % 2,
        diceValue: roll,
        winner: null,
        canRollDice: true
      };

      setGameState(newState);
      if (connection) {
        connection.send({ type: 'gameState', state: newState });
      }
      setIsRolling(false);
    }, 500);
  };

  const isMyTurn = gameState.currentPlayer === myPlayerIndex;

  const renderBoard = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      const rowCells = [];
      for (let col = 0; col < 10; col++) {
        const cellNumber = row % 2 === 1 
          ? row * 10 + (10 - col)
          : row * 10 + col + 1;

        const snakeOrLadder = snakesAndLadders.find(sl => sl.from === cellNumber);
        const playersHere = gameState.players
          .map((p, idx) => ({ ...p, index: idx }))
          .filter(p => p.position === cellNumber);

        rowCells.push(
          <div
            key={cellNumber}
            className={`board-cell ${
              snakeOrLadder ? `has-${snakeOrLadder.type}` : ''
            }`}
          >
            <span className="cell-number">{cellNumber}</span>
            {snakeOrLadder && (
              <span className="snake-ladder-icon">
                {snakeOrLadder.type === 'snake' ? '🐍' : '🪜'}
              </span>
            )}
            <div className="players-on-cell">
              {playersHere.map((player) => (
                <div
                  key={player.index}
                  className="player-token"
                  style={{ backgroundColor: player.color }}
                />
              ))}
            </div>
          </div>
        );
      }
      cells.push(
        <div key={row} className="board-row">
          {rowCells}
        </div>
      );
    }
    return cells;
  };

  return (
    <div className="game-container snake-ladders-game">
      <div className="game-header">
        <h2>🐍 Snake & Ladders 🪜</h2>
        <button className="btn btn-danger" onClick={onExit}>Exit</button>
      </div>

      <div className="game-info">
        <div className="player-info-row">
          <div className="player-card" style={{ borderColor: playerColors[0] }}>
            <div className="player-dot" style={{ backgroundColor: playerColors[0] }} />
            <div>
              <div className="player-name">You</div>
              <div className="player-position">Position: {gameState.players[myPlayerIndex].position}</div>
            </div>
          </div>
          <div className="player-card" style={{ borderColor: playerColors[1] }}>
            <div className="player-dot" style={{ backgroundColor: playerColors[1] }} />
            <div>
              <div className="player-name">Opponent</div>
              <div className="player-position">Position: {gameState.players[1 - myPlayerIndex].position}</div>
            </div>
          </div>
        </div>
        <div className="current-turn">
          {gameState.winner !== null ? (
            <span style={{ color: gameState.winner === myPlayerIndex ? '#10b981' : '#ef4444' }}>
              {gameState.winner === myPlayerIndex ? 'You Win! 🏆' : 'Opponent Wins!'}
            </span>
          ) : (
            isMyTurn ? 'Your Turn - Roll the Dice!' : "Opponent's Turn"
          )}
        </div>
      </div>

      <div className="dice-section">
        <div className={`dice-display ${isRolling ? 'rolling' : ''}`}>
          {gameState.diceValue || '?'}
        </div>
        <button
          className="btn btn-primary"
          onClick={rollDice}
          disabled={!gameState.canRollDice || !isMyTurn || gameState.winner !== null || isRolling}
        >
          {isRolling ? 'Rolling...' : 'Roll Dice'}
        </button>
      </div>

      <div className="snake-ladders-board">
        {renderBoard()}
      </div>

      <div className="game-legend">
        <div className="legend-item">
          <span>🪜</span>
          <span>Ladders take you UP</span>
        </div>
        <div className="legend-item">
          <span>🐍</span>
          <span>Snakes take you DOWN</span>
        </div>
      </div>
    </div>
  );
}

export default SnakeLaddersGame;