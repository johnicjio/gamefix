import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Board from './components/Board';
import Piece from './components/Piece';
import Dice from './components/Dice';
import Multiplayer from './components/Multiplayer';
import { useGameStore } from './store/GameStore';
import { useSound } from './hooks/useSound';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  
  const {
    pieces,
    currentTurn,
    diceValue,
    canRoll,
    isRolling,
    winner,
    myColor,
    isHost,
    rollDice,
    movePiece,
    getValidMoves,
    nextTurn
  } = useGameStore();
  
  const killSound = useSound('kill');
  
  const handleRoll = () => {
    if (isHost) {
      rollDice();
    }
  };
  
  const handlePieceClick = (pieceId: string) => {
    if (!diceValue || currentTurn !== myColor) return;
    
    const validMoves = getValidMoves(diceValue);
    if (!validMoves.includes(pieceId)) return;
    
    // Check if this move will capture
    const piece = pieces.find(p => p.id === pieceId);
    const targetPos = piece?.position === -1 ? 0 : (piece?.position || 0) + diceValue;
    const captured = pieces.find(p => 
      p.position === targetPos && 
      p.color !== currentTurn &&
      p.position !== -1
    );
    
    if (captured) {
      killSound.play();
    }
    
    movePiece(pieceId, diceValue);
    setSelectedPiece(null);
    
    setTimeout(() => {
      nextTurn();
    }, 500);
  };
  
  const validMoves = diceValue ? getValidMoves(diceValue) : [];
  
  if (!gameStarted) {
    return <Multiplayer onGameStart={() => setGameStarted(true)} />;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="mb-8 text-center"
      >
        <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
          Premium Ludo
        </h1>
        <div className="flex items-center justify-center gap-4">
          <div className={`px-4 py-2 rounded-lg font-bold ${
            myColor === 'red' ? 'bg-ludo-red' : 'bg-ludo-green'
          } text-white`}>
            You: {myColor?.toUpperCase()}
          </div>
          <div className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur-sm text-white font-bold">
            Turn: {currentTurn.toUpperCase()}
          </div>
        </div>
      </motion.div>
      
      {/* Game Board */}
      <div className="relative">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/10 backdrop-blur-md rounded-3xl p-8 shadow-2xl"
        >
          <div className="relative">
            <Board />
            
            {/* Pieces overlay */}
            <svg
              width="600"
              height="600"
              viewBox="0 0 600 600"
              className="absolute top-0 left-0 pointer-events-none"
              style={{ pointerEvents: 'none' }}
            >
              <g style={{ pointerEvents: 'auto' }}>
                {pieces.map((piece) => (
                  <Piece
                    key={piece.id}
                    piece={piece}
                    onClick={() => handlePieceClick(piece.id)}
                    isSelectable={validMoves.includes(piece.id) && currentTurn === myColor}
                  />
                ))}
              </g>
            </svg>
          </div>
        </motion.div>
        
        {/* Dice */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="absolute -right-24 top-1/2 -translate-y-1/2"
        >
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4">
            <Dice onRoll={handleRoll} />
            {diceValue && validMoves.length === 0 && currentTurn === myColor && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-white text-sm mt-2 text-center font-bold"
              >
                No valid moves!
              </motion.p>
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Winner Modal */}
      <AnimatePresence>
        {winner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.5, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.5, rotate: 10 }}
              className="bg-white rounded-3xl p-12 text-center shadow-2xl max-w-md"
            >
              <div className="text-8xl mb-6">🏆</div>
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                {winner === myColor ? 'You Win!' : 'Opponent Wins!'}
              </h2>
              <p className="text-gray-600 text-xl">
                {winner.toUpperCase()} is the champion!
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Instructions */}
      {currentTurn === myColor && canRoll && !isRolling && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-8 bg-white/20 backdrop-blur-md rounded-2xl px-6 py-4 text-white text-center font-bold"
        >
          🎲 Click the dice to roll!
        </motion.div>
      )}
      
      {diceValue && validMoves.length > 0 && currentTurn === myColor && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mt-8 bg-white/20 backdrop-blur-md rounded-2xl px-6 py-4 text-white text-center font-bold"
        >
          ✨ Select a piece to move!
        </motion.div>
      )}
    </div>
  );
}

export default App;