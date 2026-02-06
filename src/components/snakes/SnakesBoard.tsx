import React from 'react';
import { motion } from 'framer-motion';
import { useRetroStore } from '../../store/useRetroStore';
import { SNAKES, LADDERS } from '../../constants/gameRules';

const SnakesBoard: React.FC = () => {
  const { snakesState, handleSnakeMove, currentTurnIndex, players } = useRetroStore();
  const currentPlayer = players[currentTurnIndex];

  // Helper to generate grid cells (10x10)
  // Rows alternate direction: 
  // 100 99 ... 91
  // 81  82 ... 90
  const renderGrid = () => {
    const cells = [];
    for (let row = 9; row >= 0; row--) {
      const isEvenRow = row % 2 === 0;
      for (let col = 0; col < 10; col++) {
        const idx = isEvenRow ? row * 10 + col + 1 : row * 10 + (9 - col) + 1;
        const isSnakeHead = SNAKES[idx];
        const isLadderBase = LADDERS[idx];
        
        cells.push(
          <div 
            key={idx} 
            className={`
              relative border border-slate-700/50 flex items-center justify-center text-xs font-mono text-slate-500
              ${(row + col) % 2 === 0 ? 'bg-slate-800/50' : 'bg-slate-900/50'}
              ${isSnakeHead ? 'bg-red-900/20' : ''}
              ${isLadderBase ? 'bg-green-900/20' : ''}
            `}
          >
            {idx}
            {isSnakeHead && <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-50">🐍</div>}
            {isLadderBase && <div className="absolute inset-0 flex items-center justify-center text-2xl opacity-50">🪜</div>}
          </div>
        );
      }
    }
    return cells;
  };

  // Helper for coordinates
  const getSnakeCoords = (pos: number) => {
    if (pos === 0) return { x: -5, y: 95 }; // Start off-board
    const row = Math.floor((pos - 1) / 10);
    const col = (pos - 1) % 10;
    
    // Zigzag logic
    const visualRow = 9 - row; // 0 is bottom
    const visualCol = row % 2 === 0 ? col : 9 - col;
    
    return { x: visualCol * 10, y: visualRow * 10 };
  };

  return (
    <div className="relative w-full aspect-square bg-slate-900 border-4 border-fuchsia-600 rounded-xl shadow-[0_0_30px_rgba(192,38,211,0.2)] overflow-hidden">
      <div className="absolute inset-0 grid grid-cols-10 grid-rows-10">
        {renderGrid()}
      </div>

      {/* Players */}
      {snakesState.playerPositions.map((p, i) => {
        const coords = getSnakeCoords(p.position);
        const player = players.find(pl => pl.id === p.playerId);
        
        return (
          <motion.div
            key={p.playerId}
            className="absolute w-[8%] h-[8%] flex items-center justify-center text-2xl drop-shadow-lg z-10"
            style={{
              left: `${coords.x + 1}%`,
              top: `${coords.y + 1}%`
            }}
            initial={false}
            animate={{ left: `${coords.x + 1}%`, top: `${coords.y + 1}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {player?.avatar || '👤'}
          </motion.div>
        );
      })}
    </div>
  );
};

export default SnakesBoard;
