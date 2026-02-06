import { useState } from 'react';
import { GameType } from './types';
import GameLobby from './components/GameLobby';
import LudoGame from './components/games/LudoGame';
import TicTacToeGame from './components/games/TicTacToeGame';
import RockPaperScissorsGame from './components/games/RockPaperScissorsGame';
import SnakeLaddersGame from './components/games/SnakeLaddersGame';
import './styles.css';

function App() {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [peerId, setPeerId] = useState<string>('');
  const [remotePeerId, setRemotePeerId] = useState<string>('');

  const handleGameSelect = (game: GameType) => {
    setSelectedGame(game);
  };

  const handleStartGame = (myPeerId: string, otherPeerId: string) => {
    setPeerId(myPeerId);
    setRemotePeerId(otherPeerId);
    setGameStarted(true);
  };

  const handleBackToLobby = () => {
    setSelectedGame(null);
    setGameStarted(false);
    setPeerId('');
    setRemotePeerId('');
  };

  const renderGame = () => {
    if (!gameStarted || !selectedGame) return null;

    const gameProps = {
      peerId,
      remotePeerId,
      onExit: handleBackToLobby
    };

    switch (selectedGame) {
      case 'ludo':
        return <LudoGame {...gameProps} />;
      case 'tictactoe':
        return <TicTacToeGame {...gameProps} />;
      case 'rps':
        return <RockPaperScissorsGame {...gameProps} />;
      case 'snakeladders':
        return <SnakeLaddersGame {...gameProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      {!gameStarted ? (
        <GameLobby
          selectedGame={selectedGame}
          onGameSelect={handleGameSelect}
          onStartGame={handleStartGame}
        />
      ) : (
        renderGame()
      )}
    </div>
  );
}

export default App;