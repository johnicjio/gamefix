
import React, { useState } from 'react';
import { GameType } from './types';
import LudoGame from './components/ludo/LudoGame';
import WordQuest from './components/word/WordQuest';
import WelcomeScreen from './components/WelcomeScreen';
import EndScreen from './components/EndScreen';
import { Gamepad2 } from 'lucide-react';

const App: React.FC = () => {
  const [phase, setPhase] = useState<'WELCOME' | 'GAME' | 'END'>('WELCOME');
  const [selectedGame, setSelectedGame] = useState<GameType>(GameType.LUDO);
  const [playerName, setPlayerName] = useState('');
  const [winner, setWinner] = useState('');

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

  const handleGameEnd = (winnerName: string) => {
    setWinner(winnerName);
    setPhase('END');
  };

  const handleSelectGame = (type: GameType) => {
    setSelectedGame(type);
    setPhase('GAME');
  };

  const resetToMenu = () => {
    setPhase('WELCOME');
  };

  const renderGame = () => {
    const props = { playerName, onGameEnd: handleGameEnd };
    
    switch (selectedGame) {
      case GameType.LUDO: return <LudoGame {...props} />;
      case GameType.WORD_QUEST: return <WordQuest {...props} />;
      default: return <LudoGame {...props} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 selection:bg-indigo-500 selection:text-white overflow-x-hidden">
      {phase === 'WELCOME' && (
        <WelcomeScreen 
          onSelectGame={handleSelectGame} 
          isHost={true} 
          connectedCount={1} 
          playerName={playerName} 
          roomCode="LOCAL"
        />
      )}

      {phase === 'GAME' && (
        <div className="p-4 md:p-10 animate-in zoom-in duration-500">
          <div className="max-w-7xl mx-auto">
            <button 
              onClick={resetToMenu}
              className="mb-8 px-6 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-[10px] font-black hover:bg-gray-800 transition-colors uppercase tracking-widest flex items-center gap-2 group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Menu
            </button>
            {renderGame()}
          </div>
        </div>
      )}

      {phase === 'END' && (
        <EndScreen 
          winnerName={winner} 
          isHost={true} 
          gameType={selectedGame}
          onReset={resetToMenu}
          onRestart={() => setPhase('GAME')}
        />
      )}
    </div>
  );
};

export default App;
