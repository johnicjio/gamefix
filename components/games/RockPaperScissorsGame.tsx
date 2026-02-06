import { useState, useEffect } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { RPSChoice, RPSGameState } from '../../types';
import './RockPaperScissors.css';

interface RPSGameProps {
  peerId: string;
  remotePeerId: string;
  onExit: () => void;
}

const initialState: RPSGameState = {
  player1Choice: null,
  player2Choice: null,
  player1Score: 0,
  player2Score: 0,
  round: 1,
  winner: null,
  showResult: false
};

const choices: RPSChoice[] = ['rock', 'paper', 'scissors'];

function RockPaperScissorsGame({ peerId, remotePeerId, onExit }: RPSGameProps) {
  const [gameState, setGameState] = useState<RPSGameState>(initialState);
  const [connection, setConnection] = useState<DataConnection | null>(null);
  const [peer, setPeer] = useState<Peer | null>(null);
  const [isPlayer1, setIsPlayer1] = useState(true);
  const [myChoice, setMyChoice] = useState<RPSChoice>(null);
  const [opponentChoice, setOpponentChoice] = useState<RPSChoice>(null);
  const [roundWinner, setRoundWinner] = useState<string>('');

  useEffect(() => {
    const newPeer = new Peer(peerId);
    setPeer(newPeer);

    newPeer.on('open', () => {
      const conn = newPeer.connect(remotePeerId);
      setConnection(conn);
      setIsPlayer1(true);

      conn.on('data', (data: any) => {
        if (data.type === 'choice') {
          handleOpponentChoice(data.choice);
        } else if (data.type === 'reset') {
          resetGame();
        }
      });
    });

    newPeer.on('connection', (conn) => {
      setConnection(conn);
      setIsPlayer1(false);

      conn.on('data', (data: any) => {
        if (data.type === 'choice') {
          handleOpponentChoice(data.choice);
        } else if (data.type === 'reset') {
          resetGame();
        }
      });
    });

    return () => {
      newPeer.destroy();
    };
  }, [peerId, remotePeerId]);

  const determineWinner = (choice1: RPSChoice, choice2: RPSChoice): 'player1' | 'player2' | 'tie' => {
    if (choice1 === choice2) return 'tie';
    if (
      (choice1 === 'rock' && choice2 === 'scissors') ||
      (choice1 === 'paper' && choice2 === 'rock') ||
      (choice1 === 'scissors' && choice2 === 'paper')
    ) {
      return 'player1';
    }
    return 'player2';
  };

  const handleChoice = (choice: RPSChoice) => {
    if (myChoice || gameState.winner) return;

    setMyChoice(choice);
    if (connection) {
      connection.send({ type: 'choice', choice });
    }
  };

  const handleOpponentChoice = (choice: RPSChoice) => {
    setOpponentChoice(choice);
  };

  useEffect(() => {
    if (myChoice && opponentChoice) {
      setTimeout(() => {
        const choice1 = isPlayer1 ? myChoice : opponentChoice;
        const choice2 = isPlayer1 ? opponentChoice : myChoice;
        
        const result = determineWinner(choice1, choice2);
        let newP1Score = gameState.player1Score;
        let newP2Score = gameState.player2Score;
        let winnerText = '';

        if (result === 'player1') {
          newP1Score++;
          winnerText = isPlayer1 ? 'You won this round!' : 'Opponent won this round!';
        } else if (result === 'player2') {
          newP2Score++;
          winnerText = isPlayer1 ? 'Opponent won this round!' : 'You won this round!';
        } else {
          winnerText = "It's a tie!";
        }

        setRoundWinner(winnerText);

        let finalWinner = null;
        if (newP1Score >= 3) {
          finalWinner = isPlayer1 ? 'You won the game! 🏆' : 'Opponent won the game!';
        } else if (newP2Score >= 3) {
          finalWinner = isPlayer1 ? 'Opponent won the game!' : 'You won the game! 🏆';
        }

        setGameState({
          ...gameState,
          player1Score: newP1Score,
          player2Score: newP2Score,
          round: gameState.round + 1,
          showResult: true,
          winner: finalWinner
        });

        setTimeout(() => {
          if (!finalWinner) {
            setMyChoice(null);
            setOpponentChoice(null);
            setRoundWinner('');
            setGameState(prev => ({ ...prev, showResult: false }));
          }
        }, 2000);
      }, 500);
    }
  }, [myChoice, opponentChoice]);

  const resetGame = () => {
    setGameState(initialState);
    setMyChoice(null);
    setOpponentChoice(null);
    setRoundWinner('');
  };

  const handleReset = () => {
    resetGame();
    if (connection) {
      connection.send({ type: 'reset' });
    }
  };

  const getChoiceEmoji = (choice: RPSChoice) => {
    if (!choice) return '❓';
    const emojis = { rock: '🪨', paper: '📝', scissors: '✂️' };
    return emojis[choice];
  };

  const myScore = isPlayer1 ? gameState.player1Score : gameState.player2Score;
  const opponentScore = isPlayer1 ? gameState.player2Score : gameState.player1Score;

  return (
    <div className="game-container rps-game">
      <div className="game-header">
        <h2>✊ Rock Paper Scissors ✌️</h2>
        <button className="btn btn-danger" onClick={onExit}>Exit</button>
      </div>

      <div className="rps-scores">
        <div className="score-card">
          <div className="score-label">You</div>
          <div className="score-value">{myScore}</div>
        </div>
        <div className="score-divider">Best of 5</div>
        <div className="score-card">
          <div className="score-label">Opponent</div>
          <div className="score-value">{opponentScore}</div>
        </div>
      </div>

      {gameState.showResult && (
        <div className="rps-result">
          <div className="choice-display">
            <div className="choice-item">
              <div className="choice-emoji">{getChoiceEmoji(myChoice)}</div>
              <div className="choice-label">You</div>
            </div>
            <div className="vs">VS</div>
            <div className="choice-item">
              <div className="choice-emoji">{getChoiceEmoji(opponentChoice)}</div>
              <div className="choice-label">Opponent</div>
            </div>
          </div>
          <div className="round-winner">{roundWinner}</div>
        </div>
      )}

      {gameState.winner && (
        <div className="game-winner">
          <h2>{gameState.winner}</h2>
          <button className="btn btn-primary" onClick={handleReset}>
            Play Again
          </button>
        </div>
      )}

      {!gameState.showResult && !gameState.winner && (
        <div className="rps-choices">
          <div className="choice-status">
            {myChoice ? 'Waiting for opponent...' : 'Make your choice!'}
          </div>
          <div className="choices-grid">
            {choices.map((choice) => (
              <button
                key={choice}
                className={`choice-button ${myChoice === choice ? 'selected' : ''} ${myChoice && myChoice !== choice ? 'disabled' : ''}`}
                onClick={() => handleChoice(choice)}
                disabled={!!myChoice}
              >
                <span className="choice-emoji-big">{getChoiceEmoji(choice)}</span>
                <span className="choice-name">{choice}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RockPaperScissorsGame;