import React, { useState } from 'react';
import { useRetroStore } from './store/useRetroStore';
import RetroShell from './components/common/RetroShell';
import RetroDice from './components/common/RetroDice';
import LudoBoard from './components/ludo/LudoBoard';

function App() {
  const { activeGame, initializeHost, joinGame, hostId, connectionStatus, rollDice, diceValue, isRolling } = useRetroStore();
  const [joinInput, setJoinInput] = useState('');

  if (activeGame === 'LOBBY') {
    return (
      <RetroShell title="RETROVERSE LOBBY">
        <div className="flex flex-col items-center gap-8 mt-20">
          <div className="p-8 border-4 border-cyan-500/50 rounded-2xl bg-slate-800/50 backdrop-blur">
            <h2 className="text-2xl font-bold mb-4 text-cyan-400">HOST A SESSION</h2>
            <button 
              onClick={() => initializeHost()}
              className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded shadow-[0_0_15px_rgba(8,145,178,0.5)] transition-all"
            >
              CREATE NEW UNIVERSE
            </button>
            {hostId && (
              <div className="mt-4 p-4 bg-black/40 rounded border border-dashed border-slate-500">
                <p className="text-sm text-slate-400">SHARE THIS CODE:</p>
                <p className="text-2xl font-mono text-yellow-400 tracking-widest select-all cursor-pointer">
                  {hostId}
                </p>
                <div className="mt-4 text-xs text-green-400 animate-pulse">
                  STATUS: {connectionStatus}
                </div>
              </div>
            )}
          </div>

          <div className="p-8 border-4 border-fuchsia-500/50 rounded-2xl bg-slate-800/50 backdrop-blur">
            <h2 className="text-2xl font-bold mb-4 text-fuchsia-400">JOIN A UNIVERSE</h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="ENTER HOST CODE"
                className="bg-slate-900 border-2 border-slate-600 p-3 rounded text-white font-mono focus:border-fuchsia-500 outline-none"
              />
              <button 
                onClick={() => joinGame(joinInput)}
                className="px-6 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded shadow-[0_0_15px_rgba(192,38,211,0.5)] transition-all"
              >
                CONNECT
              </button>
            </div>
          </div>
        </div>
      </RetroShell>
    );
  }

  return (
    <RetroShell title={activeGame}>
       <div className="flex gap-8">
         <div className="flex-1">
           {activeGame === 'LUDO' && <LudoBoard />}
           {/* Snakes and TTT components would go here */}
         </div>
         
         <div className="w-64 flex flex-col items-center gap-8">
            <div className="p-6 bg-slate-800 rounded-xl border-2 border-slate-600 flex flex-col items-center">
               <h3 className="text-cyan-400 font-bold mb-4">ACTION PANEL</h3>
               <RetroDice 
                 value={diceValue} 
                 rolling={isRolling} 
                 onClick={rollDice} 
                 disabled={false /* Check turn logic here */}
               />
               <div className="mt-4 text-center">
                 <p className="text-xs text-slate-500">CURRENT TURN</p>
                 <p className="text-xl font-bold text-yellow-400">PLAYER 1</p>
               </div>
            </div>
         </div>
       </div>
    </RetroShell>
  );
}

export default App;
