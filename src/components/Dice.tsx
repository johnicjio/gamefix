import { motion } from 'framer-motion';
import { useGameStore } from '../store/GameStore';
import { useSound } from '../hooks/useSound';

interface DiceProps {
  onRoll: () => void;
}

const diceDots: { [key: number]: Array<{ x: number; y: number }> } = {
  1: [{ x: 40, y: 40 }],
  2: [{ x: 20, y: 20 }, { x: 60, y: 60 }],
  3: [{ x: 20, y: 20 }, { x: 40, y: 40 }, { x: 60, y: 60 }],
  4: [{ x: 20, y: 20 }, { x: 60, y: 20 }, { x: 20, y: 60 }, { x: 60, y: 60 }],
  5: [{ x: 20, y: 20 }, { x: 60, y: 20 }, { x: 40, y: 40 }, { x: 20, y: 60 }, { x: 60, y: 60 }],
  6: [{ x: 20, y: 20 }, { x: 60, y: 20 }, { x: 20, y: 40 }, { x: 60, y: 40 }, { x: 20, y: 60 }, { x: 60, y: 60 }]
};

export default function Dice({ onRoll }: DiceProps) {
  const { diceValue, canRoll, isRolling, currentTurn, myColor } = useGameStore();
  const popSound = useSound('pop');
  
  const canClick = canRoll && currentTurn === myColor && !isRolling;
  
  const handleRoll = () => {
    if (canClick) {
      popSound.play();
      onRoll();
    }
  };
  
  return (
    <motion.div
      className="relative cursor-pointer select-none"
      onClick={handleRoll}
      whileHover={canClick ? { scale: 1.05 } : {}}
      whileTap={canClick ? { scale: 0.95 } : {}}
      animate={isRolling ? {
        rotate: [0, 180, 360, 540, 720],
        scale: [1, 1.2, 1]
      } : {}}
      transition={{ duration: 1, ease: 'easeInOut' }}
    >
      <svg width="80" height="80" viewBox="0 0 80 80">
        {/* Dice face */}
        <rect
          x="5"
          y="5"
          width="70"
          height="70"
          rx="12"
          fill="white"
          stroke="#333"
          strokeWidth="2"
          className="drop-shadow-lg"
        />
        
        {/* Dots */}
        {diceValue && diceDots[diceValue]?.map((dot, i) => (
          <circle
            key={i}
            cx={dot.x}
            cy={dot.y}
            r="6"
            fill="#333"
          />
        ))}
        
        {/* Question mark when no value */}
        {!diceValue && (
          <text
            x="40"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="32"
            fontWeight="bold"
            fill="#666"
          >
            ?
          </text>
        )}
      </svg>
      
      {canClick && (
        <motion.div
          className="absolute inset-0 border-4 border-green-400 rounded-xl"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      )}
    </motion.div>
  );
}