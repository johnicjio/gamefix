import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { GameType } from '../types';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export const TicTacToeBoard: React.FC = () => {
  const { gameState, sendInput, myPlayerId } = useGameStore();
  const { tictactoe, players } = gameState;

  if (!tictactoe) return null;

  const handleCellClick = (index: number) => {
    if (tictactoe.winner || tictactoe.board[index] || tictactoe.currentTurn !== myPlayerId) return;
    
    sendInput({
      game: GameType.TIC_TAC_TOE,
      action: 'MOVE',
      data: { cellIndex: index }
    });
  };

  const getPlayerColor = (pid: string) => players.find(p => p.id === pid)?.color || '#fff';

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-2xl font-bold tracking-widest text-retro-primary drop-shadow-[0_0_5px_rgba(0,240,255,0.8)]">
        TIC - TAC - TOE
      </div>
      
      <div className="grid grid-cols-3 gap-2 bg-retro-panel p-2 rounded-xl shadow-2xl border border-gray-800">
        {tictactoe.board.map((cell, idx) => {
          const isWinningCell = tictactoe.winningLine?.includes(idx);
          return (
            <motion.div
              key={idx}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => handleCellClick(idx)}
              className={clsx(
                "w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center text-5xl font-black cursor-pointer rounded-lg transition-all",
                "bg-[#121212] border-2 border-gray-800 hover:border-gray-600",
                cell && "border-retro-primary shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]",
                isWinningCell && "!bg-retro-success/20 !border-retro-success scale-105 z-10"
              )}
            >
              {cell && (
                <motion.span 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  style={{ color: getPlayerColor(cell) }}
                  className="drop-shadow-[0_0_10px]"
                >
                  {cell === gameState.playerOrder[0] ? 'X' : 'O'}
                </motion.span>
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="bg-retro-panel px-6 py-2 rounded-full border border-gray-700">
        {tictactoe.winner ? (
          <span className="text-retro-success font-bold animate-pulse">
            WINNER: {players.find(p => p.id === tictactoe.winner)?.name}
          </span>
        ) : tictactoe.isDraw ? (
          <span className="text-gray-400">DRAW GAME</span>
        ) : (
          <div className="flex items-center gap-2">
             <span className="text-gray-400 text-sm">TURN:</span>
             <span className="font-bold" style={{ color: getPlayerColor(tictactoe.currentTurn) }}>
                {players.find(p => p.id === tictactoe.currentTurn)?.name}
             </span>
          </div>
        )}
      </div>
    </div>
  );
};
