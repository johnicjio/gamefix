import { useState, useEffect } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { LudoGameState, LudoPiece } from '../../types';
import './Ludo.css';

interface LudoGameProps {
  peerId: string;
  remotePeerId: string;
  onExit: () => void;
}

const colors: ('red' | 'blue')[] = ['red', 'blue'];

const createInitialPieces = (): LudoPiece[] => {
  const pieces: LudoPiece[] = [];
  colors.forEach((color, playerIndex) => {
    for (let i = 0; i < 4; i++) {
      pieces.push({
        id: `${color}-${i}`,
        color,
        position: -1,
        isInPlay: false
      });
    }
  });
  return pieces;
};

const initialState: LudoGameState = {
  pieces: createInitialPieces(),
  currentPlayer: 0,
  diceValue: null,
  lastRoll: 0,
  canRollDice: true
};

function LudoGame({ peerId, remotePeerId, onExit }: LudoGameProps) {
  const [gameState, setGameState] = useState<LudoGameState>(initialState);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPlayerIndex, setMyPlayerIndex] = useState(0);
  const [winner, setWinner] = useState<string | null>(null);

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
        } else if (data.type === 'winner') {
          setWinner(data.winner);
        }
      });
    });

    newPeer.on('connection', (conn) => {
      setConnection(conn);
      setMyPlayerIndex(1);

      conn.on('data', (data: any) => {
        if (data.type === 'gameState') {
          setGameState(data.state);
        } else if (data.type === 'winner') {
          setWinner(data.winner);
        }
      });
    });

    return () => {
      newPeer.destroy();
    };
  }, [peerId, remotePeerId]);

  const rollDice = () => {
    if (!gameState.canRollDice || gameState.currentPlayer !== myPlayerIndex || winner) return;

    const roll = Math.floor(Math.random() * 6) + 1;
    const newState = {
      ...gameState,
      diceValue: roll,
      lastRoll: roll,
      canRollDice: false
    };

    setGameState(newState);
    if (connection) {
      connection.send({ type: 'gameState', state: newState });
    }
  };

  const movePiece = (pieceId: string) => {
    if (gameState.canRollDice || gameState.currentPlayer !== myPlayerIndex || !gameState.diceValue || winner) return;

    const piece = gameState.pieces.find(p => p.id === pieceId);
    if (!piece || piece.color !== colors[myPlayerIndex]) return;

    const newPieces = [...gameState.pieces];
    const pieceIndex = newPieces.findIndex(p => p.id === pieceId);

    // If piece is at home and rolled 6, bring it to start
    if (piece.position === -1 && gameState.diceValue === 6) {
      newPieces[pieceIndex] = {
        ...piece,
        position: myPlayerIndex * 13,
        isInPlay: true
      };
    } else if (piece.isInPlay) {
      const newPosition = piece.position + gameState.diceValue;
      
      // Check if piece reached home (simplified - position > 51)
      if (newPosition > 51) {
        newPieces[pieceIndex] = {
          ...piece,
          position: 100
        };
        
        // Check for winner
        const finishedPieces = newPieces.filter(
          p => p.color === piece.color && p.position === 100
        );
        if (finishedPieces.length === 4) {
          setWinner(colors[myPlayerIndex]);
          if (connection) {
            connection.send({ type: 'winner', winner: colors[myPlayerIndex] });
          }
        }
      } else {
        newPieces[pieceIndex] = {
          ...piece,
          position: newPosition % 52
        };
      }
    } else {
      return;
    }

    const nextPlayer = gameState.diceValue === 6 ? gameState.currentPlayer : (gameState.currentPlayer + 1) % 2;
    
    const newState = {
      pieces: newPieces,
      currentPlayer: nextPlayer,
      diceValue: null,
      lastRoll: gameState.lastRoll,
      canRollDice: true
    };

    setGameState(newState);
    if (connection) {
      connection.send({ type: 'gameState', state: newState });
    }
  };

  const getPlayerColor = (playerIndex: number) => colors[playerIndex];
  const isMyTurn = gameState.currentPlayer === myPlayerIndex;

  const myPieces = gameState.pieces.filter(p => p.color === colors[myPlayerIndex]);
  const opponentPieces = gameState.pieces.filter(p => p.color !== colors[myPlayerIndex]);

  return (
    <div className="game-container ludo-game">
      <div className="game-header">
        <h2>🎲 Ludo Game</h2>
        <button className="btn btn-danger" onClick={onExit}>Exit</button>
      </div>

      <div className="game-info">
        <div className="player-indicators">
          <div className={`player-indicator ${myPlayerIndex === 0 ? 'red' : 'blue'}`}>
            You: {colors[myPlayerIndex].toUpperCase()}
          </div>
          <div className={`player-indicator ${myPlayerIndex === 0 ? 'blue' : 'red'}`}>
            Opponent: {colors[1 - myPlayerIndex].toUpperCase()}
          </div>
        </div>
        <div className="current-turn">
          {winner ? (
            <span style={{ color: winner === colors[myPlayerIndex] ? '#10b981' : '#ef4444' }}>
              {winner === colors[myPlayerIndex] ? 'You Win! 🏆' : 'Opponent Wins!'}
            </span>
          ) : (
            isMyTurn ? 'Your Turn' : "Opponent's Turn"
          )}
        </div>
      </div>

      <div className="ludo-board-container">
        <div className="dice-section">
          <div className="dice-display">
            {gameState.diceValue || gameState.lastRoll || '?'}
          </div>
          <button
            className="btn btn-primary"
            onClick={rollDice}
            disabled={!gameState.canRollDice || !isMyTurn || !!winner}
          >
            Roll Dice
          </button>
        </div>

        <div className="ludo-board">
          <div className="board-track">
            {Array.from({ length: 52 }).map((_, i) => {
              const piecesHere = gameState.pieces.filter(p => p.position === i);
              return (
                <div key={i} className="track-cell" data-position={i}>
                  {piecesHere.map(piece => (
                    <div
                      key={piece.id}
                      className={`piece piece-${piece.color}`}
                      style={{ width: '20px', height: '20px' }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="pieces-area">
          <div className="my-pieces">
            <h3>Your Pieces ({colors[myPlayerIndex]})</h3>
            <div className="pieces-grid">
              {myPieces.map(piece => (
                <button
                  key={piece.id}
                  className={`piece-button piece-${piece.color} ${piece.position === 100 ? 'finished' : ''}`}
                  onClick={() => movePiece(piece.id)}
                  disabled={!isMyTurn || gameState.canRollDice || !gameState.diceValue || !!winner}
                >
                  {piece.position === -1 ? 'Home' : piece.position === 100 ? '✓' : piece.position}
                </button>
              ))}
            </div>
          </div>

          <div className="opponent-pieces">
            <h3>Opponent Pieces ({colors[1 - myPlayerIndex]})</h3>
            <div className="pieces-grid">
              {opponentPieces.map(piece => (
                <div
                  key={piece.id}
                  className={`piece-button piece-${piece.color} opponent ${piece.position === 100 ? 'finished' : ''}`}
                >
                  {piece.position === -1 ? 'Home' : piece.position === 100 ? '✓' : piece.position}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LudoGame;