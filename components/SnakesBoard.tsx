import React from 'react';
import { useGameStore } from '../store/useGameStore';
import { GameType } from '../types';
import { SNAKES_BOARD_SIZE, SNAKES_MAP, LADDERS_MAP } from '../constants';
import clsx from 'clsx';
import { motion } from 'framer-motion';

export const SnakesBoard: React.FC = () => {
  const { gameState, sendInput, myPlayerId } = useGameStore();
  const { snakes, players } = gameState;

  if (!snakes) return null;

  const handleRoll = () => {
    if (snakes.winner || snakes.currentTurn !== myPlayerId) return;
    sendInput({ game: GameType.SNAKES_AND_LADDERS, action: 'ROLL' });
  };

  const renderCell = (index: number) => {
    // Board is 10x10. Usually bottom-left is 1, zigzag up.
    // Row 0 (bottom): 1-10. Row 1: 20-11. Row 2: 21-30.
    // Index comes in 0-99 (representing 100 cells). 
    // We need to map visual grid index to board number.
    const row = 9 - Math.floor(index / 10);
    const col = index % 10;
    
    let boardNum: number;
    if (row % 2 === 0) {
      // Even row (visual from top): 9, 7, 5, 3, 1 (which are board rows 0, 2, 4...)
      // Wait, let's map simply: 
      // Visual Row 9 (bottom) -> Board 1-10
      // Visual Row 8 -> Board 20-11
      boardNum = row * 10 + col + 1;
    } else {
       boardNum = row * 10 + (9 - col) + 1;
    }

    const playersHere = Object.entries(snakes.positions).filter(([_, pos]) => pos === boardNum);
    
    // Features
    const isSnakeHead = Object.keys(SNAKES_MAP).map(Number).includes(boardNum);
    const isLadderBase = Object.keys(LADDERS_MAP).map(Number).includes(boardNum);
    
    return (
      <div 
        key={index}
        className={clsx(
            "relative w-full h-full border border-gray-800 flex items-center justify-center text-[10px] sm:text-xs font-mono text-gray-600 select-none",
            isSnakeHead && "bg-red-900/20",
            isLadderBase && "bg-green-900/20"
        )}
      >
        <span className="absolute top-0.5 left-0.5 opacity-50">{boardNum}</span>
        
        {isSnakeHead && <span className="absolute text-red-500 opacity-50">🐍</span>}
        {isLadderBase && <span className="absolute text-green-500 opacity-50">🪜</span>}

        <div className="flex flex-wrap items-center justify-center gap-1 z-10">
          {playersHere.map(([pid]) => {
            const p = players.find(pl => pl.id === pid);
            return (
              <motion.div
                key={pid}
                layoutId={`snake-p-${pid}`}
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full border border-white shadow-md"
                style={{ backgroundColor: p?.color }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-3xl">
      <div className="flex justify-between w-full items-end px-4">
        <h2 className="text-2xl font-bold text-retro-secondary">SNAKES & LADDERS</h2>
        {snakes.lastRoll && <div className="text-xl font-mono text-retro-primary">ROLLED: {snakes.lastRoll}</div>}
      </div>

      {/* Grid */}
      <div className="w-full aspect-square bg-[#1a1a20] rounded-lg border-4 border-gray-800 shadow-2xl grid grid-cols-10 grid-rows-10">
        {Array.from({ length: 100 }).map((_, i) => renderCell(i))}
      </div>

      {/* Controls */}
      <div className="flex gap-4 items-center bg-retro-panel p-4 rounded-xl border border-gray-700 w-full justify-between">
        <div className="flex flex-col">
            <span className="text-xs text-gray-400">CURRENT TURN</span>
            <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: players.find(p => p.id === snakes.currentTurn)?.color }} 
                />
                <span className="font-bold">{players.find(p => p.id === snakes.currentTurn)?.name}</span>
            </div>
        </div>

        <button
            onClick={handleRoll}
            disabled={snakes.currentTurn !== myPlayerId || !!snakes.winner}
            className={clsx(
                "px-8 py-3 rounded-lg font-black text-black transition-all",
                snakes.currentTurn === myPlayerId && !snakes.winner 
                  ? "bg-retro-primary hover:scale-105 shadow-[0_0_20px_rgba(0,240,255,0.4)]" 
                  : "bg-gray-700 cursor-not-allowed opacity-50"
            )}
        >
            {snakes.winner ? 'GAME OVER' : 'ROLL DICE'}
        </button>
      </div>
    </div>
  );
};
