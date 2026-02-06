
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { LudoColor, Piece, Player } from '../../types';
import { getPieceCoordinates, START_OFFSETS, SAFE_SPOTS } from './ludoLogic';
import { Star, Crown, Shield } from 'lucide-react';

interface LudoBoardProps {
  pieces: Piece[];
  players: Player[];
  onPieceClick: (piece: Piece) => void;
  validMoves: string[]; 
  movingPieceId: string | null;
  diceValue: number | null;
}

const LudoBoard: React.FC<LudoBoardProps> = ({ 
    pieces, 
    onPieceClick, 
    validMoves,
    movingPieceId,
    diceValue
}) => {
  const pieceStacks = useMemo(() => {
      const stacks: Record<string, Piece[]> = {};
      pieces.forEach(p => {
          if (p.position === -1) return;
          let key = "";
          if (p.position === 57) key = "CENTER";
          else if (p.position > 50) key = `STRETCH-${p.color}-${p.position}`;
          else key = `CELL-${(START_OFFSETS[p.color] + p.position) % 52}`;

          if (!stacks[key]) stacks[key] = [];
          stacks[key].push(p);
      });
      return stacks;
  }, [pieces]);

  const renderCells = () => {
      const cells = [];
      const CELL_SIZE = 100 / 15;
      for(let y=0; y<15; y++) {
          for(let x=0; x<15; x++) {
              if ((x<6 && y<6) || (x>8 && y<6) || (x<6 && y>8) || (x>8 && y>8)) continue; 
              if (x>5 && x<9 && y>5 && y<9) continue;

              let bgClass = "bg-transparent";
              let content = null;

              if (y===7 && x>0 && x<6) bgClass = "bg-green-500/10";
              if (x===1 && y===6) bgClass = "bg-green-600/60"; 
              if (x===7 && y>0 && y<6) bgClass = "bg-yellow-500/10";
              if (x===8 && y===1) bgClass = "bg-yellow-500/60"; 
              if (y===7 && x>8 && x<14) bgClass = "bg-blue-500/10";
              if (x===13 && y===8) bgClass = "bg-blue-600/60"; 
              if (x===7 && y>8 && y<14) bgClass = "bg-red-500/10";
              if (x===6 && y===13) bgClass = "bg-red-600/60";

              if (x===1 && y===6) content = <Star size={8} className="text-white opacity-40 animate-pulse" />;
              if ((x===6 && y===2) || (x===8 && y===12) || (x===2 && y===8) || (x===12 && y===6)) {
                  content = <Shield size={8} className="text-white/10" />;
              }

              cells.push(
                  <div key={`${x}-${y}`} 
                       className={`absolute border-[0.5px] border-white/5 flex items-center justify-center transition-all duration-300 ${bgClass}`}
                       style={{ left: `${x * CELL_SIZE}%`, top: `${y * CELL_SIZE}%`, width: `${CELL_SIZE}%`, height: `${CELL_SIZE}%` }}>
                      {content}
                  </div>
              );
          }
      }
      return cells;
  };

  return (
    <div className="relative w-full max-w-[500px] aspect-square bg-gray-950 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.6)] border-[12px] border-gray-900 mx-auto select-none touch-none">
        <style>{`
            @keyframes piece-hop {
                0%, 100% { transform: translateY(0) scale(1.1); }
                50% { transform: translateY(-30px) scale(1.3); }
            }
            @keyframes piece-glow {
                0%, 100% { box-shadow: 0 0 10px currentColor; }
                50% { box-shadow: 0 0 25px currentColor; }
            }
            .piece-hop-anim { animation: piece-hop 0.15s cubic-bezier(0.1, 0.7, 0.1, 1) infinite; }
            .piece-glow-anim { animation: piece-glow 1.5s ease-in-out infinite; }
        `}</style>
        
        {/* Home Bases */}
        {[LudoColor.GREEN, LudoColor.YELLOW, LudoColor.BLUE, LudoColor.RED].map((color, idx) => {
            const pos = [
                { top: 0, left: 0, c: 'bg-green-600/5', b: 'border-green-500/20' },
                { top: 0, right: 0, c: 'bg-yellow-500/5', b: 'border-yellow-500/20' },
                { bottom: 0, right: 0, c: 'bg-blue-600/5', b: 'border-blue-500/20' },
                { bottom: 0, left: 0, c: 'bg-red-600/5', b: 'border-red-500/20' }
            ][idx];
            return (
                <div key={color} className={`absolute w-[40%] h-[40%] ${pos.c} p-4`} style={{ ...pos }}>
                    <div className={`w-full h-full rounded-[3rem] border-4 ${pos.b} flex items-center justify-center backdrop-blur-md shadow-inner relative overflow-hidden`}>
                        <div className="grid grid-cols-2 gap-6 relative z-10 opacity-30">
                            {[0,1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-white/5 ring-4 ring-white/10" />)}
                        </div>
                    </div>
                </div>
            );
        })}

        <div className="absolute left-[40%] top-[40%] w-[20%] h-[20%] z-10 bg-gray-900 border-4 border-gray-800 rotate-45 scale-[0.8] rounded-[2rem] flex items-center justify-center shadow-2xl">
            <Crown size={32} className="text-yellow-400 -rotate-45 relative z-10 animate-pulse" />
        </div>

        {renderCells()}

        {pieces.map((piece, i) => {
            const coords = getPieceCoordinates(piece.color, piece.position, parseInt(piece.id.split('-')[1]));
            const isValidMove = validMoves.includes(piece.id);
            const isMoving = piece.id === movingPieceId;
            const CELL_SIZE = 100 / 15;
            
            const isHome = piece.position === 57;
            const stackKey = isHome ? "CENTER" : (piece.position > 50 ? `STRETCH-${piece.color}-${piece.position}` : `CELL-${(START_OFFSETS[piece.color] + piece.position) % 52}`);
            const stack = pieceStacks[stackKey] || [];
            const stackIdx = stack.findIndex(p => p.id === piece.id);

            // Dynamic Stacking Offset
            let offsetX = 0; let offsetY = 0;
            if (stack.length > 1 && piece.position !== -1 && piece.position !== 57) {
                const angle = (stackIdx / stack.length) * Math.PI * 2;
                offsetX = Math.cos(angle) * 1.8;
                offsetY = Math.sin(angle) * 1.8;
            }

            const theme = {
                [LudoColor.GREEN]: 'bg-green-500 ring-green-300 text-green-400',
                [LudoColor.YELLOW]: 'bg-yellow-400 ring-yellow-200 text-yellow-300',
                [LudoColor.BLUE]: 'bg-blue-500 ring-blue-300 text-blue-400',
                [LudoColor.RED]: 'bg-red-500 ring-red-300 text-red-400',
            };

            return (
                <div
                    key={piece.id}
                    onClick={() => isValidMove && onPieceClick(piece)}
                    className={`absolute rounded-full w-[6.5%] h-[6.5%] flex items-center justify-center shadow-2xl ring-2 transition-all duration-150 piece-glow-anim
                        ${theme[piece.color]} 
                        ${isValidMove ? 'cursor-pointer hover:scale-125 z-40 scale-110 ring-white' : ''}
                        ${isMoving ? 'piece-hop-anim z-50' : ''}
                    `}
                    style={{
                        left: `calc(${coords.x * CELL_SIZE}% + ${offsetX + 0.3}%)`,
                        top: `calc(${coords.y * CELL_SIZE}% + ${offsetY + 0.3}%)`,
                        zIndex: isMoving ? 100 : (isHome ? 10 : 20 + i),
                    }}
                >
                    {isHome ? <Crown size={14} className="text-white" /> : <div className="w-3 h-3 bg-white/60 rounded-full" />}
                </div>
            );
        })}
    </div>
  );
};

export default LudoBoard;
