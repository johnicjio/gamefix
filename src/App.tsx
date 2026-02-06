import React, { useState } from 'react';
import { useRetroStore } from './store/useRetroStore';
import RetroShell from './components/common/RetroShell';
import RetroDice from './components/common/RetroDice';
import LudoBoard from './components/ludo/LudoBoard';
import SnakesBoard from './components/snakes/SnakesBoard';
import TicTacToeBoard from './components/tictactoe/TicTacToeBoard';

function App() {
  const { 
    activeGame, 
    initializeHost, 
    joinGame, 
    hostId, 
    connectionStatus, 
    rollDice, 
    diceValue, 
    isRolling,
    players,
    currentTurnIndex,
    setGameType 
  } = useRetroStore();
  
  const [joinInput, setJoinInput] = useState('');

  if (activeGame === 'LOBBY') {
    return (
      <RetroShell title="RETROVERSE LOBBY">
        <div className="flex flex-col items-center gap-8 mt-12 animate-in fade-in zoom-in duration-500">
          {/* HOST SECTION */}
          <div className="w-full max-w-md p-8 border-4 border-cyan-500/30 rounded-2xl bg-slate-800/80 backdrop-blur shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <h2 className="text-2xl font-black mb-6 text-cyan-400 font-mono tracking-tighter">INITIATE SERVER</h2>
            
            {!hostId ? (
              <button 
                onClick={() => initializeHost()}
                className="w-full py-5 bg-cyan-600 hover:bg-cyan-500 text-white font-black font-mono tracking-widest rounded shadow-[0_0_15px_rgba(8,145,178,0.5)] transition-all active:scale-95"
              >
                HOST NEW SESSION
              </button>
            ) : (
              <div className="space-y-4">
                 <div className="p-4 bg-black/60 rounded border border-dashed border-cyan-800">
                    <p className="text-xs text-slate-500 font-mono mb-1">SESSION ID (SHARE THIS)</p>
                    <p className="text-3xl font-black font-mono text-yellow-400 tracking-widest select-all">{hostId}</p>
                 </div>
                 
                 <div className="flex items-center gap-2 text-xs font-mono">
                    <div className={`w-3 h-3 rounded-full ${connectionStatus === 'CONNECTED' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className="text-slate-400">STATUS: {connectionStatus}</span>
                 </div>

                 {players.length > 1 && (
                   <div className="grid grid-cols-3 gap-2 mt-4">
                     <button onClick={() => setGameType('LUDO')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold text-white border border-slate-500">PLAY LUDO</button>
                     <button onClick={() => setGameType('SNAKES')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold text-white border border-slate-500">PLAY SNAKES</button>
                     <button onClick={() => setGameType('TICTACTOE')} className="p-2 bg-slate-700 hover:bg-slate-600 rounded text-xs font-bold text-white border border-slate-500">PLAY TTT</button>
                   </div>
                 )}
              </div>
            )}
          </div>

          <div className="text-slate-600 font-mono text-xs">- OR -</div>

          {/* JOIN SECTION */}
          <div className="w-full max-w-md p-8 border-4 border-fuchsia-500/30 rounded-2xl bg-slate-800/80 backdrop-blur shadow-[0_0_30px_rgba(192,38,211,0.1)]">
            <h2 className="text-2xl font-black mb-6 text-fuchsia-400 font-mono tracking-tighter">JOIN PROTOCOL</h2>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                placeholder="PASTE SESSION ID"
                className="flex-1 bg-slate-900 border-2 border-slate-700 p-4 rounded text-white font-mono focus:border-fuchsia-500 outline-none transition-colors"
              />
              <button 
                onClick={() => joinGame(joinInput)}
                className="px-8 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black font-mono rounded shadow-[0_0_15px_rgba(192,38,211,0.5)] transition-all active:scale-95"
              >
                LINK
              </button>
            </div>
          </div>
        </div>
      </RetroShell>
    );
  }

  // Active Game View
  return (
    <RetroShell title={activeGame}>
       <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
         
         {/* Main Game Board Area */}
         <div className="flex-1 w-full max-w-[600px] aspect-square mx-auto">
           {activeGame === 'LUDO' && <LudoBoard />}
           {activeGame === 'SNAKES' && <SnakesBoard />}
           {activeGame === 'TICTACTOE' && <TicTacToeBoard />}
         </div>
         
         {/* Sidebar Controls */}
         <div className="w-full lg:w-80 flex flex-col gap-6">
            
            {/* Player List */}
            <div className="bg-slate-800/80 p-4 rounded-xl border-2 border-slate-700">
               <h3 className="text-xs font-bold text-slate-500 mb-4 font-mono">PLAYERS</h3>
               <div className="space-y-3">
                 {players.map((p, idx) => (
                   <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${idx === currentTurnIndex ? 'bg-slate-700 border-yellow-400/50 shadow-lg' : 'border-transparent opacity-60'}`}>
                      <div className="text-2xl">{p.avatar}</div>
                      <div>
                        <div className="font-bold text-sm text-white">{p.name} {p.isHost && '👑'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{p.color}</div>
                      </div>
                      {idx === currentTurnIndex && <div className="ml-auto w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />}
                   </div>
                 ))}
               </div>
            </div>

            {/* Action Panel (Dice) */}
            {activeGame !== 'TICTACTOE' && (
              <div className="bg-slate-800/80 p-6 rounded-xl border-2 border-cyan-500/30 flex flex-col items-center shadow-2xl">
                 <h3 className="text-cyan-400 font-black mb-6 font-mono tracking-widest text-sm">RNG MODULE</h3>
                 <RetroDice 
                   value={diceValue} 
                   rolling={isRolling} 
                   onClick={rollDice} 
                   disabled={players[currentTurnIndex]?.id !== players.find(p => p.id === hostId || !p.isHost)?.id && false /* Logic fix needed for self id check in prod */}
                 />
                 <div className="mt-6 text-center">
                   <p className="text-[10px] text-slate-500 font-mono mb-1">CURRENT INSTRUCTION</p>
                   <p className="text-lg font-bold text-white uppercase animate-pulse">
                     {isRolling ? 'CALCULATING...' : 'AWAITING INPUT'}
                   </p>
                 </div>
              </div>
            )}
            
            {/* Host Controls */}
            {players.find(p => p.isHost && p.id === hostId) && (
               <button onClick={() => setGameType('LOBBY')} className="p-3 bg-red-900/50 hover:bg-red-900/80 text-red-200 text-xs font-mono font-bold rounded border border-red-800 transition-colors">
                  TERMINATE SESSION
               </button>
            )}

         </div>
       </div>
    </RetroShell>
  );
}

export default App;
