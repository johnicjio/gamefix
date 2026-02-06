import { motion } from 'framer-motion';
import { Piece, Player, LudoColor } from '../../types/ludo';
import { getPieceCoordinates } from '../../utils/ludoLogic';

interface LudoBoardProps {
  pieces: Piece[];
  players: Player[];
  onPieceClick: (piece: Piece) => void;
  validMoves: string[];
  movingPieceId: string | null;
  diceValue: number | null;
}

const COLOR_MAP = {
  [LudoColor.GREEN]: '#26de81',
  [LudoColor.YELLOW]: '#fed330',
  [LudoColor.BLUE]: '#45aaf2',
  [LudoColor.RED]: '#FF4757'
};

const LudoBoard: React.FC<LudoBoardProps> = ({ 
  pieces, 
  players, 
  onPieceClick, 
  validMoves,
  movingPieceId,
  diceValue 
}) => {
  return (
    <div className="relative w-full max-w-2xl aspect-square">
      {/* SVG Board */}
      <svg
        viewBox="0 0 500 500"
        className="w-full h-full drop-shadow-2xl"
      >
        {/* Background */}
        <rect width="500" height="500" fill="#1a1a2e" rx="40" />
        
        {/* Home Quadrants */}
        <g opacity="0.3">
          {/* Green (Top-Left) */}
          <rect x="20" y="20" width="180" height="180" fill={COLOR_MAP[LudoColor.GREEN]} rx="20" />
          <rect x="50" y="50" width="120" height="120" fill={COLOR_MAP[LudoColor.GREEN]} opacity="0.6" rx="15" />
          
          {/* Yellow (Top-Right) */}
          <rect x="300" y="20" width="180" height="180" fill={COLOR_MAP[LudoColor.YELLOW]} rx="20" />
          <rect x="330" y="50" width="120" height="120" fill={COLOR_MAP[LudoColor.YELLOW]} opacity="0.6" rx="15" />
          
          {/* Blue (Bottom-Right) */}
          <rect x="300" y="300" width="180" height="180" fill={COLOR_MAP[LudoColor.BLUE]} rx="20" />
          <rect x="330" y="330" width="120" height="120" fill={COLOR_MAP[LudoColor.BLUE]} opacity="0.6" rx="15" />
          
          {/* Red (Bottom-Left) */}
          <rect x="20" y="300" width="180" height="180" fill={COLOR_MAP[LudoColor.RED]} rx="20" />
          <rect x="50" y="330" width="120" height="120" fill={COLOR_MAP[LudoColor.RED]} opacity="0.6" rx="15" />
        </g>
        
        {/* Main Track Cells */}
        <g>
          {/* Bottom row */}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={`bottom-${i}`}
              x={210 + i * 40}
              y={340}
              width="35"
              height="35"
              fill="#2c3e50"
              stroke={i === 0 ? COLOR_MAP[LudoColor.GREEN] : '#34495e'}
              strokeWidth={i === 0 ? 3 : 1}
              rx="6"
              opacity="0.8"
            />
          ))}
          
          {/* Top row */}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={`top-${i}`}
              x={125 + i * 40}
              y="125"
              width="35"
              height="35"
              fill="#2c3e50"
              stroke={i === 0 ? COLOR_MAP[LudoColor.YELLOW] : '#34495e'}
              strokeWidth={i === 0 ? 3 : 1}
              rx="6"
              opacity="0.8"
            />
          ))}
          
          {/* Left column */}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={`left-${i}`}
              x="125"
              y={210 + i * 40}
              width="35"
              height="35"
              fill="#2c3e50"
              stroke={i === 0 ? COLOR_MAP[LudoColor.RED] : '#34495e'}
              strokeWidth={i === 0 ? 3 : 1}
              rx="6"
              opacity="0.8"
            />
          ))}
          
          {/* Right column */}
          {Array.from({ length: 6 }).map((_, i) => (
            <rect
              key={`right-${i}`}
              x="340"
              y={125 + i * 40}
              width="35"
              height="35"
              fill="#2c3e50"
              stroke={i === 2 ? COLOR_MAP[LudoColor.BLUE] : '#34495e'}
              strokeWidth={i === 2 ? 3 : 1}
              rx="6"
              opacity="0.8"
            />
          ))}
        </g>
        
        {/* Home Stretch Paths */}
        <g>
          {/* Green home stretch */}
          {Array.from({ length: 5 }).map((_, i) => (
            <rect
              key={`green-stretch-${i}`}
              x="210"
              y={330 - i * 40}
              width="35"
              height="35"
              fill={COLOR_MAP[LudoColor.GREEN]}
              opacity="0.5"
              rx="6"
            />
          ))}
          
          {/* Yellow home stretch */}
          {Array.from({ length: 5 }).map((_, i) => (
            <rect
              key={`yellow-stretch-${i}`}
              x={330 - i * 40}
              y="125"
              width="35"
              height="35"
              fill={COLOR_MAP[LudoColor.YELLOW]}
              opacity="0.5"
              rx="6"
            />
          ))}
          
          {/* Blue home stretch */}
          {Array.from({ length: 5 }).map((_, i) => (
            <rect
              key={`blue-stretch-${i}`}
              x="255"
              y={170 + i * 40}
              width="35"
              height="35"
              fill={COLOR_MAP[LudoColor.BLUE]}
              opacity="0.5"
              rx="6"
            />
          ))}
          
          {/* Red home stretch */}
          {Array.from({ length: 5 }).map((_, i) => (
            <rect
              key={`red-stretch-${i}`}
              x={170 + i * 40}
              y="255"
              width="35"
              height="35"
              fill={COLOR_MAP[LudoColor.RED]}
              opacity="0.5"
              rx="6"
            />
          ))}
        </g>
        
        {/* Center Finish */}
        <g>
          <polygon
            points="250,210 290,250 250,290 210,250"
            fill="#FFD700"
            stroke="#FFA500"
            strokeWidth="3"
          />
          <circle cx="250" cy="250" r="20" fill="#FFA500" opacity="0.8" />
        </g>
        
        {/* Safe Zones (Stars) */}
        {[[257, 340], [330, 267], [243, 125], [125, 233]].map(([x, y], i) => (
          <text
            key={`star-${i}`}
            x={x}
            y={y}
            fontSize="16"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#FFD700"
          >
            ⭐
          </text>
        ))}
      </svg>
      
      {/* Pieces Overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {pieces.map((piece) => {
          const coords = getPieceCoordinates(piece);
          const isValid = validMoves.includes(piece.id);
          const isMoving = movingPieceId === 'ANY' || movingPieceId === piece.id;
          
          return (
            <motion.div
              key={piece.id}
              className={`absolute w-10 h-10 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-xl ${isValid ? 'pointer-events-auto cursor-pointer' : ''}`}
              style={{
                backgroundColor: COLOR_MAP[piece.color],
                left: `${(coords.x / 500) * 100}%`,
                top: `${(coords.y / 500) * 100}%`,
                transform: 'translate(-50%, -50%)'
              }}
              animate={{
                scale: isValid ? [1, 1.2, 1] : 1,
                boxShadow: isValid 
                  ? [
                      '0 0 0 0 rgba(99, 102, 241, 0.4)',
                      '0 0 0 15px rgba(99, 102, 241, 0)',
                      '0 0 0 0 rgba(99, 102, 241, 0.4)'
                    ]
                  : '0 4px 6px rgba(0, 0, 0, 0.2)'
              }}
              transition={{
                scale: { repeat: Infinity, duration: 1 },
                boxShadow: { repeat: Infinity, duration: 1.5 }
              }}
              whileHover={isValid ? { scale: 1.3 } : {}}
              whileTap={isValid ? { scale: 0.9 } : {}}
              onClick={() => isValid && onPieceClick(piece)}
            >
              {/* Piece marker */}
              <div className="w-3 h-3 bg-white rounded-full opacity-60" />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default LudoBoard;