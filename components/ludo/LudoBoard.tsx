
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
}

const LudoBoard: React.FC<LudoBoardProps> = ({ 
    pieces, 
    players,
    onPieceClick, 
    validMoves,
    movingPieceId
}) => {
  
  const prevPiecesRef = useRef<Map<string, number>>(new Map());
  const [capturingPiece, setCapturingPiece] = useState<string | null>(null);

  useEffect(() => {
      pieces.forEach(p => {
          const prevPos = prevPiecesRef.current.get(p.id);
          if (prevPos !== undefined && prevPos !== -1 && p.position === -1) {
              setCapturingPiece(p.id);
              setTimeout(() => setCapturingPiece(null), 1000);
          }
          prevPiecesRef.current.set(p.id, p.position);
      });
  }, [pieces]);

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
              if (x===1 && y===6) bgClass = "bg-green-600/80"; 
              if (x===7 && y>0 && y<6) bgClass = "bg-yellow-500/10";
              if (x===8 && y===1) bgClass = "bg-yellow-500/80"; 
              if (y===7 && x>8 && x<14) bgClass = "bg-blue-500/10";
              if (x===13 && y===8) bgClass = "bg-blue-600/80"; 
              if (x===7 && y>8 && y<14) bgClass = "bg-red-500/10";
              if (x===6 && y===13) bgClass = "bg-red-600/80";

              if (SAFE_SPOTS.includes(0) && x===1 && y===6) content = <Star size={8} className="text-white opacity-40" />;
              if ((x===6 && y===2) || (x===8 && y===12) || (x===2 && y===8) || (x===12 && y===6)) {
                  content = <Shield size={8} className="text-white/20" />;
              }

              cells.push(
                  <div key={`${x}-${y}`} 
                       className={`absolute border-[0.5px] border-white/5 flex items-center justify-center ${bgClass}`}
                       style={{ left: `${x * CELL_SIZE}%`, top: `${y * CELL_SIZE}%`, width: `${CELL_SIZE}%`, height: `${CELL_SIZE}%` }}>
                      {content}
                  </div>
              );
          }
      }
      return cells;
  };

  return (
    <div className="relative w-full max-w-[500px] aspect-square bg-gray-950 rounded-[2.5rem] overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.5)] border-8 border-gray-900 mx-auto select-none touch-manipulation">
        <style>{`
            @keyframes hop-expressive {
                0%, 100% { transform: translateY(0) scale(1, 1); }
                30% { transform: translateY(-4px) scale(0.9, 1.1); }
                50% { transform: translateY(-12px) scale(1.1, 0.9); }
                70% { transform: translateY(-4px) scale(0.95, 1.05); }
            }
            @keyframes piece-pulse {
                0%, 100% { transform: scale(1); box-shadow: 0 0 10px rgba(255,255,255,0.2); }
                50% { transform: scale(1.15); box-shadow: 0 0 25px rgba(255,255,255,0.5); }
            }
            .piece-hop { animation: hop-expressive 0.35s ease-in-out infinite; }
            .valid-piece { animation: piece-pulse 1s ease-in-out infinite; }
        `}</style>
        
        {/* Bases */}
        {[LudoColor.GREEN, LudoColor.YELLOW, LudoColor.BLUE, LudoColor.RED].map((color, idx) => {
            const pos = [
                { top: 0, left: 0, c: 'bg-green-600/5', b: 'border-green-500/20' },
                { top: 0, right: 0, c: 'bg-yellow-500/5', b: 'border-yellow-500/20' },
                { bottom: 0, right: 0, c: 'bg-blue-600/5', b: 'border-blue-500/20' },
                { bottom: 0, left: 0, c: 'bg-red-600/5', b: 'border-red-500/20' }
            ][idx];
            return (
                <div key={color} className={`absolute w-[40%] h-[40%] ${pos.c} p-4`} style={{ ...pos }}>
                    <div className={`w-full h-full rounded-[2rem] border-2 ${pos.b} flex items-center justify-center backdrop-blur-sm shadow-inner relative overflow-hidden`}>
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,white,transparent)]" />
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            {[0,1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full bg-white/5 ring-1 ring-white/10 shadow-inner" />)}
                        </div>
                    </div>
                </div>
            );
        })}

        {/* Home Stretch / Finish */}
        <div className="absolute left-[40%] top-[40%] w-[20%] h-[20%] z-10 bg-gray-900 border-2 border-gray-800 rotate-45 scale-[0.8] rounded-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/20 to-transparent" />
            <Crown size={32} className="text-yellow-500 -rotate-45 relative z-10" />
        </div>

        {renderCells()}

        {/* Pieces */}
        {pieces.map((piece, i) => {
            const coords = getPieceCoordinates(piece.color, piece.position, parseInt(piece.id.split('-')[1]));
            const isValidMove = validMoves.includes(piece.id);
            const isMoving = piece.id === movingPieceId;
            const isCaptured = piece.id === capturingPiece;
            const CELL_SIZE = 100 / 15;
            
            const isHome = piece.position === 57;
            const stackKey = isHome ? "CENTER" : (piece.position > 50 ? `STRETCH-${piece.color}-${piece.position}` : `CELL-${(START_OFFSETS[piece.color] + piece.position) % 52}`);
            const stack = pieceStacks[stackKey] || [];
            const stackIdx = stack.findIndex(p => p.id === piece.id);

            let offsetX = 0; let offsetY = 0;
            if (stack.length > 1 && piece.position !== -1) {
                const angle = (stackIdx / stack.length) * Math.PI * 2;
                offsetX = Math.cos(angle) * 1.5;
                offsetY = Math.sin(angle) * 1.5;
            }

            const colors = {
                [LudoColor.GREEN]: 'bg-green-500 ring-green-300 shadow-green-500/40',
                [LudoColor.YELLOW]: 'bg-yellow-400 ring-yellow-200 shadow-yellow-400/40',
                [LudoColor.BLUE]: 'bg-blue-500 ring-blue-300 shadow-blue-500/40',
                [LudoColor.RED]: 'bg-red-500 ring-red-300 shadow-red-500/40',
            };

            return (
                <div
                    key={piece.id}
                    onClick={() => isValidMove && onPieceClick(piece)}
                    className={`absolute rounded-full w-[5.5%] h-[5.5%] flex items-center justify-center shadow-2xl ring-2
                        ${colors[piece.color]} 
                        ${isValidMove ? 'cursor-pointer valid-piece z-30 brightness-125' : ''}
                        ${isMoving ? 'piece-hop z-50' : 'transition-all duration-300 ease-out'}
                        ${isCaptured ? 'opacity-0 scale-0' : 'opacity-100'}
                    `}
                    style={{
                        left: `calc(${coords.x * CELL_SIZE}% + ${offsetX + 0.5}%)`,
                        top: `calc(${coords.y * CELL_SIZE}% + ${offsetY + 0.5}%)`,
                        zIndex: isMoving ? 100 : (isHome ? 10 : 20 + i),
                    }}
                >
                    {isHome ? <Crown size={12} className="text-white" /> : <div className="w-2.5 h-2.5 bg-white/40 rounded-full shadow-inner" />}
                    {isValidMove && <div className="absolute -inset-1 rounded-full border border-white/40 animate-ping" />}
                </div>
            );
        })}
    </div>
  );
};

export default LudoBoard;
