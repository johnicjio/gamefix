import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { Gamepad2, Wifi, Users } from 'lucide-react';

export const Lobby: React.FC = () => {
  const [targetId, setTargetId] = useState('');
  const { initHost, joinGame, statusMessage, gameState, myPlayerId } = useGameStore();

  const copyId = () => {
    if (gameState.hostId) {
      navigator.clipboard.writeText(gameState.hostId);
      alert('Room ID copied!');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-8 p-8 max-w-md mx-auto">
      <div className="text-center space-y-2">
        <div className="bg-retro-panel p-4 rounded-full inline-block border-2 border-retro-primary shadow-[0_0_15px_rgba(0,240,255,0.5)]">
          <Gamepad2 size={48} className="text-retro-primary" />
        </div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-retro-primary to-retro-accent bg-clip-text text-transparent tracking-tighter">
          RETROVERSE
        </h1>
        <p className="text-gray-400 font-mono text-sm">{statusMessage}</p>
      </div>

      {!useGameStore.getState().isConnected && (
        <div className="w-full space-y-4">
          <button
            onClick={() => initHost()}
            className="w-full py-4 bg-retro-accent hover:bg-red-600 text-white font-bold rounded-lg transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <Wifi size={20} />
            CREATE ARCADE
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-700"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#0f0f13] px-2 text-gray-500">Or Join Friend</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Enter Host ID"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="flex-1 bg-retro-panel border border-gray-700 rounded-lg px-4 py-2 text-white focus:border-retro-primary outline-none font-mono"
            />
            <button 
              onClick={() => joinGame(targetId)}
              className="px-6 bg-retro-panel border border-retro-primary text-retro-primary hover:bg-retro-primary hover:text-black font-bold rounded-lg transition-colors"
            >
              JOIN
            </button>
          </div>
        </div>
      )}

      {useGameStore.getState().isConnected && (
        <div className="w-full bg-retro-panel rounded-xl p-6 border border-gray-800 space-y-4">
          <div className="flex justify-between items-center pb-4 border-b border-gray-700">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Users size={18} className="text-retro-secondary" />
              LOBBY
            </h2>
            <button onClick={copyId} className="text-xs bg-gray-800 hover:bg-gray-700 px-2 py-1 rounded font-mono text-retro-primary">
              COPY ID
            </button>
          </div>
          <div className="space-y-2">
            {gameState.players.map(p => (
              <div key={p.id} className="flex items-center justify-between bg-[#121212] p-2 rounded border border-gray-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shadow-[0_0_8px]" style={{ backgroundColor: p.color }}></div>
                  <span className={p.id === myPlayerId ? "text-white font-bold" : "text-gray-400"}>
                    {p.name} {p.isHost && '👑'}
                  </span>
                </div>
                {p.id === myPlayerId && <span className="text-[10px] bg-retro-accent px-1 rounded">YOU</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
