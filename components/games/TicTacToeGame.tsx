import { useState, useEffect } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Cell, TicTacToeGameState } from '../../types';
import './TicTacToe.css';

interface TicTacToeGameProps {
  peerId: string;
  remotePeerId: string;
  onExit: () => void;
}

const initialState: TicTacToeGameState = {
  board: Array(9).fill(null),
  currentPlayer: 'X',
  winner: null
};

function TicTacToeGame({ peerId, remotePeerId, onExit }: TicTacToeGameProps) {
  const [gameState, setGameState] = useState<TicTacToeGameState>(initialState);
  const [mySymbol, setMySymbol] = useState<'X' | 'O'>('X');
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(true);

  useEffect(() => {
    const newPeer = new Peer(peerId);
    setPeer(newPeer);

    newPeer.on('open', () => {
      const conn = newPeer.connect(remotePeerId);
      setConnection(conn);
      setMySymbol('X');
      setIsMyTurn(true);

      conn.on('data', (data: any) => {
        if (data.type === 'move') {
          handleRemoteMove(data.index);
        } else if (data.type === 'reset') {
          setGameState(initialState);
          setIsMyTurn(mySymbol === 'X');
        }
      });
    });

    newPeer.on('connection', (conn) => {
      setConnection(conn);
      setMySymbol('O');
      setIsMyTurn(false);

      conn.on('data', (data: any) => {
        if (data.type === 'move') {
          handleRemoteMove(data.index);
        } else if (data.type === 'reset') {
          setGameState(initialState);
          setIsMyTurn(mySymbol === 'X');
        }
      });
    });

    return () => {
      newPeer.destroy();
    };
  }, [peerId, remotePeerId]);

  const checkWinner = (board: Cell[]): 'X' | 'O' | 'draw' | null => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
      [0, 4, 8], [2, 4, 6] // diagonals
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as 'X' | 'O';
      }
    }

    if (board.every(cell => cell !== null)) {
      return 'draw';
    }

    return null;
  };

  const handleCellClick = (index: number) => {
    if (!isMyTurn || gameState.board[index] || gameState.winner) return;

    const newBoard = [...gameState.board];
    newBoard[index] = mySymbol;
    
    const winner = checkWinner(newBoard);
    const newState = {
      ...gameState,
      board: newBoard,
      currentPlayer: mySymbol === 'X' ? 'O' : 'X',
      winner
    };

    setGameState(newState);
    setIsMyTurn(false);

    if (connection) {
      connection.send({ type: 'move', index });
    }
  };

  const handleRemoteMove = (index: number) => {
    const opponentSymbol = mySymbol === 'X' ? 'O' : 'X';
    const newBoard = [...gameState.board];
    newBoard[index] = opponentSymbol;
    
    const winner = checkWinner(newBoard);
    const newState = {
      ...gameState,
      board: newBoard,
      currentPlayer: mySymbol,
      winner
    };

    setGameState(newState);
    setIsMyTurn(true);
  };

  const handleReset = () => {
    setGameState(initialState);
    setIsMyTurn(mySymbol === 'X');
    if (connection) {
      connection.send({ type: 'reset' });
    }
  };

  const getStatusMessage = () => {
    if (gameState.winner === 'draw') return "It's a Draw!";
    if (gameState.winner) {
      return gameState.winner === mySymbol ? 'You Win! 🏆' : 'You Lose! 😢';
    }
    return isMyTurn ? 'Your Turn' : "Opponent's Turn";
  };

  return (
    <div className="game-container tictactoe-game">
      <div className="game-header">
        <h2>❌ Tic Tac Toe ⭕</h2>
        <button className="btn btn-danger" onClick={onExit}>Exit</button>
      </div>

      <div className="game-info">
        <div className="player-info">
          <span className="player-badge">You: {mySymbol}</span>
          <span className="player-badge">Opponent: {mySymbol === 'X' ? 'O' : 'X'}</span>
        </div>
        <div className="current-turn" style={{ 
          color: gameState.winner ? (gameState.winner === mySymbol ? '#10b981' : '#ef4444') : '#6366f1' 
        }}>
          {getStatusMessage()}
        </div>
      </div>

      <div className="tictactoe-board">
        {gameState.board.map((cell, index) => (
          <button
            key={index}
            className={`tictactoe-cell ${
              cell === 'X' ? 'cell-x' : cell === 'O' ? 'cell-o' : ''
            } ${!isMyTurn || gameState.winner ? 'disabled' : ''}`}
            onClick={() => handleCellClick(index)}
            disabled={!isMyTurn || !!cell || !!gameState.winner}
          >
            {cell}
          </button>
        ))}
      </div>

      {gameState.winner && (
        <button className="btn btn-primary" onClick={handleReset}
          style={{ marginTop: '20px', width: '100%' }}>
          Play Again
        </button>
      )}
    </div>
  );
}

export default TicTacToeGame;