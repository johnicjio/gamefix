import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRetroStore } from '../../store/useRetroStore';

const TicTacToeBoard: React.FC = () => {
  const { tictactoeState, handleTTTMove, players, currentTurnIndex } = useRetroStore();
  const currentPlayer = players[currentTurnIndex];

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto bg-slate-900 rounded-xl p-4">
      <div className="grid grid-cols-3 grid-rows-3 gap-4 h-full">
        {tictactoeState.board.map((cell, idx) => (
          <motion.div
            key={idx}
            className={`
              relative bg-slate-800 rounded-xl border-2 
              ${!cell && !tictactoeState.winner ? 'border-slate-700 hover:border-cyan-500/50 cursor-pointer' : 'border-slate-700'}
              flex items-center justify-center
            `}
            onClick={() => handleTTTMove(idx)}
            whileHover={!cell && !tictactoeState.winner ? { scale: 0.98 } : {}}
            whileTap={!cell && !tictactoeState.winner ? { scale: 0.95 } : {}}
          >
            <AnimatePresence>
              {cell === 'X' && (
                <motion.svg viewBox="0 0 100 100" className="w-2/3 h-2/3" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                  <line x1="20" y1="20" x2="80" y2="80" stroke="#06b6d4" strokeWidth="10" strokeLinecap="round" className="drop-shadow-[0_0_10px_#06b6d4]" />
                  <line x1="80" y1="20" x2="20" y2="80" stroke="#06b6d4" strokeWidth="10" strokeLinecap="round" className="drop-shadow-[0_0_10px_#06b6d4]" />
                </motion.svg>
              )}
              {cell === 'O' && (
                <motion.svg viewBox="0 0 100 100" className="w-2/3 h-2/3" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                   <circle cx="50" cy="50" r="35" fill="none" stroke="#d946ef" strokeWidth="10" strokeLinecap="round" className="drop-shadow-[0_0_10px_#d946ef]" />
                </motion.svg>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {/* Winning Line */}
      {tictactoeState.winningLine && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
           {/* Logic to draw line based on indices 0-8 */}
           {/* Simplified for demo: Just a big overlay or specific line calc required */}
        </svg>
      )}
      
      {/* Winner Overlay */}
      <AnimatePresence>
        {tictactoeState.winner && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30"
          >
             <div className="text-center">
               <h2 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-lg">
                 VICTORY
               </h2>
               <p className="text-white mt-4 font-mono">PLAYER {tictactoeState.winner === players[0].id ? '1' : '2'} WINS</p>
               <button 
                 onClick={() => window.location.reload()} 
                 className="mt-8 px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-mono rounded"
               >
                 PLAY AGAIN
               </button>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TicTacToeBoard;
