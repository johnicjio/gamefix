import { useState } from 'react';
import { motion } from 'framer-motion';
import LudoGame from './components/ludo/LudoGame';

function App() {
  const [playerName] = useState('Player 1');
  const [gameEnded, setGameEnded] = useState(false);
  const [winner, setWinner] = useState('');

  const handleGameEnd = (winnerName: string) => {
    setWinner(winnerName);
    setGameEnded(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950 overflow-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <LudoGame 
          playerName={playerName}
          onGameEnd={handleGameEnd}
        />
      </motion.div>
    </div>
  );
}

export default App;