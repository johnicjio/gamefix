
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
  const [capturingPiece, setCapturingPiece] = useState<string | null>(null);
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null);
  const prevPiecesRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
      pieces.forEach(p => {
          const prevPos = prevPiecesRef.current.get(p.id);
          if (prevPos !== undefined && prevPos !== -1 && p.position === -1) {
              setCapturingPiece(p.id);
              setTimeout(() => setCapturingPiece(null), 800);
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

  // Calculate target highlight for hovered valid piece
  const targetHighlight = useMemo(() => {
      if (!hoveredPiece || !diceValue || !validMoves.includes(hoveredPiece)) return null;
      const piece = pieces.find(p => p.id === hoveredPiece);
      if (!piece) return null;
      
      const targetPos = piece.position === -1 ? 0 : piece.position + diceValue;
      if (targetPos > 57) return null;
      
      const coords = getPieceCoordinates(piece.color, targetPos, 0); 
      return { x: coords.x, y: coords.y };
  }, [hoveredPiece, diceValue, validMoves, pieces]);

  const renderCells = () => {
      const cells = [];
      const CELL_SIZE = 100 / 15;
      for(let y=0; y<15; y++) {
          for(let x=0; x<15; x++) {
              // Skip bases and center
              if ((x<6 && y<6) || (x>8 && y<6) || (x<6 && y>8) || (x>8 && y>8)) continue; 
              if (x>5 && x<9 && y>5 && y<9) continue;

              let bgClass = "bg-transparent";
              let content = null;
              let isHighlight = false;

              // Check highlight
              if (targetHighlight && targetHighlight.x === x && targetHighlight.y === y) {
                  isHighlight = true;
              }

              // Home Stretches
              if (y===7 && x>0 && x<6) bgClass = "bg-green-500/20";
              if (x===1 && y===6) bgClass = "bg-green-600/80"; 
              if (x===7 && y>0 && y<6) bgClass = "bg-yellow-500/20";
              if (x===8 && y===1) bgClass = "bg-yellow-500/80"; 
              if (y===7 && x>8 && x<14) bgClass = "bg-blue-500/20";
              if (x===13 && y===8) bgClass = "bg-blue-600/80"; 
              if (x===7 && y>8 && y<14) bgClass = "bg-red-500/20";
              if (x===6 && y===13) bgClass = "bg-red-600/80";

              if (SAFE_SPOTS.includes(0) && x===1 && y===6) content = <Star size={8} className="text-white opacity-60 animate-pulse" />;
              if ((x===6 && y===2) || (x===8 && y===12) || (x===2 && y===8) || (x===12 && y===6)) {
                  content = <Shield size={8} className="text-white/20" />;
              }

              cells.push(
                  <div key={`${x}-${y}`} 
                       className={`absolute border-[0.5px] border-white/5 flex items-center justify-center transition-all duration-300
                           ${bgClass}
                           ${isHighlight ? 'bg-white/40 ring-2 ring-white z-0 animate-pulse' : ''}
                       `}
                       style={{ left: `${x * CELL_SIZE}%`, top: `${y * CELL_SIZE}%`, width: `${CELL_SIZE}%`, height: `${CELL_SIZE}%` }}>
                      {content}
                  </div>
              );
          }
      }
      return cells;
  };

  return (
    <div className="relative w-full max-w-[500px] aspect-square bg-gray-950 rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] border-[10px] border-gray-900 mx-auto select-none touch-none">
        <style>{`
            @keyframes piece-hop {
                0%, 100% { transform: translateY(0) scale(1, 1); }
                40% { transform: translateY(-12px) scale(0.9, 1.15); }
                60% { transform: translateY(-14px) scale(0.85, 1.2); }
                80% { transform: translateY(-4px) scale(1.1, 0.9); }
            }
            @keyframes active-pulse {
                0%, 100% { box-shadow: 0 0 10px rgba(255,255,255,0.2); transform: scale(1); }
                50% { box-shadow: 0 0 25px rgba(255,255,255,0.6); transform: scale(1.15); }
            }
            @keyframes capture-burst {
                0% { transform: scale(1.5); opacity: 1; filter: brightness(2); }
                100% { transform: scale(0); opacity: 0; filter: brightness(1); }
            }
            .piece-hop-anim { animation: piece-hop 0.3s ease-in-out infinite; }
            .active-piece-anim { animation: active-pulse 1s ease-in-out infinite; }
            .captured-anim { animation: capture-burst 0.6s ease-out forwards; }
        `}</style>
        
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        {/* Bases */}
        {[LudoColor.GREEN, LudoColor.YELLOW, LudoColor.BLUE, LudoColor.RED].map((color, idx) => {
            const pos = [
                { top: 0, left: 0, c: 'bg-green-600/10', b: 'border-green-500/30' },
                { top: 0, right: 0, c: 'bg-yellow-500/10', b: 'border-yellow-500/30' },
                { bottom: 0, right: 0, c: 'bg-blue-600/10', b: 'border-blue-500/30' },
                { bottom: 0, left: 0, c: 'bg-red-600/10', b: 'border-red-500/30' }
            ][idx];
            return (
                <div key={color} className={`absolute w-[40%] h-[40%] ${pos.c} p-4`} style={{ ...pos }}>
                    <div className={`w-full h-full rounded-[2.5rem] border-4 ${pos.b} flex items-center justify-center backdrop-blur-sm shadow-inner relative overflow-hidden group`}>
                        <div className="absolute inset-0 opacity-20 bg-gradient-to-br from-white via-transparent to-black" />
                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            {[0,1,2,3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-white/5 ring-2 ring-white/10 shadow-inner" />)}
                        </div>
                    </div>
                </div>
            );
        })}

        <div className="absolute left-[40%] top-[40%] w-[20%] h-[20%] z-10 bg-gray-900 border-4 border-gray-800 rotate-45 scale-[0.8] rounded-3xl flex items-center justify-center overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20" />
            <Crown size={32} className="text-yellow-400 -rotate-45 relative z-10 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" />
        </div>

        {renderCells()}

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
                const dist = 1.8;
                offsetX = Math.cos(angle) * dist;
                offsetY = Math.sin(angle) * dist;
            }

            const colors = {
                [LudoColor.GREEN]: 'bg-green-500 ring-green-300 shadow-green-500/50',
                [LudoColor.YELLOW]: 'bg-yellow-400 ring-yellow-200 shadow-yellow-400/50',
                [LudoColor.BLUE]: 'bg-blue-500 ring-blue-300 shadow-blue-500/50',
                [LudoColor.RED]: 'bg-red-500 ring-red-300 shadow-red-500/50',
            };

            return (
                <div
                    key={piece.id}
                    onClick={() => isValidMove && onPieceClick(piece)}
                    onMouseEnter={() => isValidMove && setHoveredPiece(piece.id)}
                    onMouseLeave={() => setHoveredPiece(null)}
                    className={`absolute rounded-full w-[5.5%] h-[5.5%] flex items-center justify-center shadow-2xl ring-2
                        ${colors[piece.color]} 
                        ${isValidMove ? 'cursor-pointer active-piece-anim z-40 brightness-110' : ''}
                        ${isMoving ? 'piece-hop-anim z-50' : 'transition-all duration-300 cubic-bezier(0.175, 0.885, 0.32, 1.275)'}
                        ${isCaptured ? 'captured-anim pointer-events-none' : 'opacity-100'}
                        ${piece.position === -1 ? 'scale-[1.2]' : ''}
                    `}
                    style={{
                        left: `calc(${coords.x * CELL_SIZE}% + ${offsetX + 0.5}%)`,
                        top: `calc(${coords.y * CELL_SIZE}% + ${offsetY + 0.5}%)`,
                        zIndex: isMoving ? 100 : (isHome ? 10 : 20 + i),
                    }}
                >
                    {isHome ? (
                        <Crown size={12} className="text-white" />
                    ) : (
                        <div className="w-2.5 h-2.5 bg-white/50 rounded-full shadow-inner ring-1 ring-black/10" />
                    )}
                    {isValidMove && (
                        <div className="absolute inset-0 rounded-full border-2 border-white/60 animate-ping" />
                    )}
                </div>
            );
        })}
    </div>
  );
};

export default LudoBoard;
