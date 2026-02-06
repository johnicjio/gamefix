
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

  // Track captures for animation
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

  // Group pieces on same cell for stack rendering
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

  // Calculate destination highlight when hovering a moveable piece
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
              // Skip home bases and center victory area (handled separately)
              if ((x<6 && y<6) || (x>8 && y<6) || (x<6 && y>8) || (x>8 && y>8)) continue; 
              if (x>5 && x<9 && y>5 && y<9) continue;

              let bgClass = "bg-transparent";
              let content = null;
              let isHighlight = false;

              if (targetHighlight && targetHighlight.x === x && targetHighlight.y === y) {
                  isHighlight = true;
              }

              // Path decorations
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
                       className={`absolute border-[0.5px] border-white/5 flex items-center justify-center transition-colors duration-500
                           ${bgClass}
                           ${isHighlight ? 'bg-white/30 ring-2 ring-white z-0 animate-pulse' : ''}
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
    <div className="relative w-full max-w-[500px] aspect-square bg-gray-950 rounded-[3rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.6)] border-[12px] border-gray-900 mx-auto select-none touch-none">
        <style>{`
            @keyframes piece-hop {
                0%, 100% { transform: translateY(0) scale(1, 1); }
                40% { transform: translateY(-15px) scale(0.9, 1.2); }
                60% { transform: translateY(-18px) scale(0.85, 1.25); }
                80% { transform: translateY(-5px) scale(1.1, 0.9); }
            }
            @keyframes active-pulse {
                0%, 100% { box-shadow: 0 0 15px rgba(255,255,255,0.2); transform: scale(1); }
                50% { box-shadow: 0 0 35px rgba(255,255,255,0.7); transform: scale(1.18); }
            }
            @keyframes capture-burst {
                0% { transform: scale(1.8); opacity: 1; filter: brightness(3); }
                100% { transform: scale(0); opacity: 0; filter: brightness(1); }
            }
            .piece-hop-anim { animation: piece-hop 0.4s ease-in-out infinite; }
            .active-piece-anim { animation: active-pulse 1.2s ease-in-out infinite; }
            .captured-anim { animation: capture-burst 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        `}</style>
        
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '30px 30px' }} />

        {/* Home Bases Layout */}
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
                        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-white via-transparent to-black" />
                        <div className="grid grid-cols-2 gap-6 relative z-10 opacity-30">
                            {[0,1,2,3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-white/5 ring-4 ring-white/10 shadow-inner" />)}
                        </div>
                    </div>
                </div>
            );
        })}

        {/* Center Victory Area */}
        <div className="absolute left-[40%] top-[40%] w-[20%] h-[20%] z-10 bg-gray-900 border-4 border-gray-800 rotate-45 scale-[0.8] rounded-[2rem] flex items-center justify-center overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-transparent to-purple-500/20" />
            <Crown size={32} className="text-yellow-400 -rotate-45 relative z-10 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse" />
        </div>

        {renderCells()}

        {/* Pieces Rendering */}
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
                const dist = 2.0;
                offsetX = Math.cos(angle) * dist;
                offsetY = Math.sin(angle) * dist;
            }

            const theme = {
                [LudoColor.GREEN]: 'bg-green-500 ring-green-300 shadow-green-500/40',
                [LudoColor.YELLOW]: 'bg-yellow-400 ring-yellow-200 shadow-yellow-400/40',
                [LudoColor.BLUE]: 'bg-blue-500 ring-blue-300 shadow-blue-500/40',
                [LudoColor.RED]: 'bg-red-500 ring-red-300 shadow-red-500/40',
            };

            return (
                <div
                    key={piece.id}
                    onClick={() => isValidMove && onPieceClick(piece)}
                    onMouseEnter={() => isValidMove && setHoveredPiece(piece.id)}
                    onMouseLeave={() => setHoveredPiece(null)}
                    className={`absolute rounded-full w-[6%] h-[6%] flex items-center justify-center shadow-2xl ring-2
                        ${theme[piece.color]} 
                        ${isValidMove ? 'cursor-pointer active-piece-anim z-40' : ''}
                        ${isMoving ? 'piece-hop-anim z-50' : 'transition-all duration-300 cubic-bezier(0.175, 0.885, 0.32, 1.275)'}
                        ${isCaptured ? 'captured-anim pointer-events-none' : 'opacity-100'}
                        ${piece.position === -1 ? 'scale-[1.3]' : ''}
                    `}
                    style={{
                        left: `calc(${coords.x * CELL_SIZE}% + ${offsetX + 0.3}%)`,
                        top: `calc(${coords.y * CELL_SIZE}% + ${offsetY + 0.3}%)`,
                        zIndex: isMoving ? 100 : (isHome ? 10 : 20 + i),
                    }}
                >
                    {isHome ? (
                        <Crown size={14} className="text-white drop-shadow-sm" />
                    ) : (
                        <div className="w-3 h-3 bg-white/60 rounded-full shadow-inner ring-1 ring-black/10" />
                    )}
                    {isValidMove && (
                        <div className="absolute inset-0 rounded-full border-2 border-white/80 animate-ping" />
                    )}
                </div>
            );
        })}
    </div>
  );
};

export default LudoBoard;
