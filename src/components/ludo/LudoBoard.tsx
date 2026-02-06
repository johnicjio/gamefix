import React from 'react';
import { motion } from 'framer-motion';
import { useRetroStore } from '../../store/useRetroStore';
import { LudoPiece, PlayerColor } from '../../types/retroverse';

// Helper to get coordinates (0-14 grid system)
const getLudoCoords = (pos: number, color: PlayerColor): {x: number, y: number} => {
  // Hardcoded path mapping for a 15x15 grid
  // This is a simplified representation. In production, a full lookup table is best.
  // Center is 7,7
  if (pos === -1) {
     // Home bases
     if (color === 'GREEN') return { x: 2, y: 2 };
     if (color === 'YELLOW') return { x: 12, y: 2 };
     if (color === 'RED') return { x: 12, y: 12 };
     if (color === 'BLUE') return { x: 2, y: 12 };
  }
  
  if (pos === 57) return { x: 7, y: 7 }; // Winner center

  // Mapping logic for main track (0-51) needs a lookup table
  // For brevity, I'll return center. *Needs implementation of full 52-tile path*
  return { x: 7, y: 7 }; 
};

const LudoBoard: React.FC = () => {
  const { ludoState, handleLudoMove, currentTurnIndex, players, diceValue } = useRetroStore();
  const currentPlayer = players[currentTurnIndex];

  return (
    <div className="relative w-full aspect-square bg-slate-800 border-4 border-slate-700 rounded-xl shadow-2xl overflow-hidden">
      {/* 15x15 Grid Layout */}
      <div className="absolute inset-0 grid grid-cols-15 grid-rows-15">
        {/* Render base quadrants */}
        <div className="col-span-6 row-span-6 bg-green-900/50 border-r-2 border-b-2 border-green-500/30 p-4">
           <div className="w-full h-full bg-green-500/20 rounded-xl flex items-center justify-center">
             <span className="text-4xl">🏠</span>
           </div>
        </div>
        {/* ... Other quadrants ... */}
      </div>

      {/* Render Pieces */}
      {ludoState.pieces.map((piece) => {
        // Offset logic for stacking
        const stackIndex = ludoState.pieces.filter(p => p.position === piece.position && p.id < piece.id).length;
        const coords = getLudoCoords(piece.position, piece.color);
        
        return (
          <motion.div
            key={piece.id}
            className={`absolute w-[4%] h-[4%] rounded-full shadow-lg border-2 border-white cursor-pointer
              ${piece.color === 'GREEN' ? 'bg-green-500' : 
                piece.color === 'YELLOW' ? 'bg-yellow-500' :
                piece.color === 'BLUE' ? 'bg-blue-500' : 'bg-red-500'}
            `}
            style={{
              left: `${(coords.x / 15) * 100 + 1}%`, // +1 for centering in cell
              top: `${(coords.y / 15) * 100 + 1}%`,
              zIndex: 10 + stackIndex
            }}
            initial={false}
            animate={{
              x: stackIndex * 5,
              y: stackIndex * -5,
              scale: stackIndex > 0 ? 0.8 : 1
            }}
            whileHover={{ scale: 1.2 }}
            onClick={() => {
              if (currentPlayer?.color === piece.color && diceValue) {
                handleLudoMove(piece.id);
              }
            }}
          />
        );
      })}
    </div>
  );
};

export default LudoBoard;
