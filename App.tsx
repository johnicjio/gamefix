import React, { useEffect } from 'react';
import { useGameStore } from './store/useGameStore';
import { Lobby } from './components/Lobby';
import { TicTacToeBoard } from './components/TicTacToeBoard';
import { SnakesBoard } from './components/SnakesBoard';
import { LudoBoard } from './components/LudoBoard';
import { GameType } from './types';
import { Monitor, RefreshCcw } from 'lucide-react';

export default function App() {
  const { gameState, startGame, myPlayerId } = useGameStore();
  
  // Check for invite link (simplistic implementation)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && !gameState.isConnected) {
       useGameStore.getState().joinGame(room);
    }
  }, []);

  const isHost = gameState.hostId === myPlayerId;

  return (
    <div className="min-h-screen bg-[#0f0f13] text-white selection:bg-retro-primary selection:text-black">
      {/* HEADER */}
      <header className="fixed top-0 w-full h-16 bg-[#0f0f13]/80 backdrop-blur-md border-b border-gray-800 z-50 flex items-center justify-between px-6">
        <div className="font-bold tracking-widest text-retro-primary flex items-center gap-2">
           <Monitor size={20} />
           RETROVERSE_OS <span className="text-xs text-gray-500">v1.0.4</span>
        </div>
        
        {gameState.isConnected && (
            <div className="flex items-center gap-4">
                <span className="text-xs font-mono text-gray-400 hidden sm:inline">
                    SESSION: {gameState.sessionId.slice(0, 8)}...
                </span>
                <div className={`w-3 h-3 rounded-full ${gameState.isConnected ? 'bg-retro-success shadow-[0_0_10px_#00ff99]' : 'bg-red-500'}`} />
            </div>
        )}
      </header>

      {/* MAIN CONTENT */}
      <main className="pt-24 pb-12 px-4 flex flex-col items-center">
        {!gameState.isConnected ? (
          <Lobby />
        ) : (
          <div className="w-full max-w-5xl flex flex-col gap-8">
            
            {/* GAME SELECTOR (HOST ONLY) */}
            {isHost && (
              <div className="bg-retro-panel p-4 rounded-xl border border-gray-800 flex flex-wrap gap-4 justify-center shadow-lg">
                <button 
                    onClick={() => startGame(GameType.TIC_TAC_TOE)}
                    className={`px-4 py-2 rounded font-bold transition-all ${gameState.activeGame === GameType.TIC_TAC_TOE ? 'bg-retro-primary text-black' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                    TIC-TAC-TOE
                </button>
                <button 
                    onClick={() => startGame(GameType.SNAKES_AND_LADDERS)}
                    className={`px-4 py-2 rounded font-bold transition-all ${gameState.activeGame === GameType.SNAKES_AND_LADDERS ? 'bg-retro-primary text-black' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                    SNAKES & LADDERS
                </button>
                <button 
                    onClick={() => startGame(GameType.LUDO)}
                    className={`px-4 py-2 rounded font-bold transition-all ${gameState.activeGame === GameType.LUDO ? 'bg-retro-primary text-black' : 'bg-gray-800 hover:bg-gray-700'}`}
                >
                    LUDO (BETA)
                </button>
              </div>
            )}

            {!isHost && gameState.activeGame === GameType.NONE && (
                <div className="text-center py-20 text-gray-500 font-mono animate-pulse">
                    WAITING FOR HOST TO SELECT CARTRIDGE...
                </div>
            )}

            {/* ACTIVE GAME RENDERER */}
            <div className="w-full flex justify-center min-h-[500px]">
                {gameState.activeGame === GameType.TIC_TAC_TOE && <TicTacToeBoard />}
                {gameState.activeGame === GameType.SNAKES_AND_LADDERS && <SnakesBoard />}
                {gameState.activeGame === GameType.LUDO && <LudoBoard />}
            </div>

          </div>
        )}
      </main>

      {/* STATUS BAR */}
      <footer className="fixed bottom-0 w-full h-8 bg-[#0a0a0c] border-t border-gray-800 flex items-center justify-between px-4 text-[10px] text-gray-500 font-mono">
        <span>CONNECTED_NODES: {gameState.players.length}</span>
        <span>LATENCY: 12ms (SIM)</span>
      </footer>
    </div>
  );
}
