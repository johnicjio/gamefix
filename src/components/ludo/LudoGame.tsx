import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LudoBoard from './LudoBoard';
import { LudoColor, Player, Piece, GameProps } from '../../types/ludo';
import { canMove, getSmartAIMove, START_OFFSETS } from '../../utils/ludoLogic';
import { audioService } from '../../services/audioService';
import { Dice5, Loader2, UserPlus, Trophy, Sparkles } from 'lucide-react';

const COLORS = [LudoColor.GREEN, LudoColor.YELLOW, LudoColor.BLUE, LudoColor.RED];

const LudoGame: React.FC<GameProps> = ({ playerName, onGameEnd, network }) => {
  const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
  const myId = network?.myId || 'LOCAL_HOST';

  const [gamePhase, setGamePhase] = useState<'SETUP' | 'PLAYING' | 'VICTORY'>('SETUP');
  const [players, setPlayers] = useState<Player[]>([
    { id: myId, name: playerName, color: LudoColor.GREEN, isBot: false, avatar: '🤴' },
    { id: 'bot-2', name: 'Bot Yellow', color: LudoColor.YELLOW, isBot: true, avatar: '🦁' },
    { id: 'bot-3', name: 'Bot Blue', color: LudoColor.BLUE, isBot: true, avatar: '🤖' },
    { id: 'bot-4', name: 'Bot Red', color: LudoColor.RED, isBot: true, avatar: '🦊' },
  ]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [winner, setWinner] = useState<Player | null>(null);

  // Host state broadcast
  useEffect(() => {
    if (isHost && network?.isConnected) {
      network.broadcastState({ gamePhase, players, pieces, currentTurn, diceValue, isRolling, isAnimating });
    }
  }, [gamePhase, players, pieces, currentTurn, diceValue, isRolling, isAnimating, isHost, network]);

  // Network commands
  useEffect(() => {
    if (!network) return;
    if (isHost) {
      network.onActionReceived((type, payload, senderId) => {
        if (type === 'CLAIM_SEAT') {
          setPlayers(prev => prev.map(p => p.color === payload.color ? { ...p, id: senderId, name: payload.name, isBot: false } : p));
        } else if (type === 'ROLL' && players[currentTurn].id === senderId) {
          handleRoll();
        } else if (type === 'MOVE' && players[currentTurn].id === senderId) {
          const pc = pieces.find(p => p.id === payload.id);
          if (pc) handleMove(pc);
        }
      });
    } else {
      network.onStateUpdate((s) => {
        setGamePhase(s.gamePhase);
        setPlayers(s.players);
        setPieces(s.pieces);
        setCurrentTurn(s.currentTurn);
        setDiceValue(s.diceValue);
        setIsRolling(s.isRolling);
        setIsAnimating(s.isAnimating);
      });
    }
  }, [network, isHost, currentTurn, pieces, players]);

  const handleRoll = async () => {
    if (isRolling || isAnimating || diceValue !== null) return;
    if (!isHost) { network?.sendAction('ROLL'); return; }

    setIsRolling(true);
    audioService.playRoll();
    await new Promise(r => setTimeout(r, 800));
    
    const roll = Math.floor(Math.random() * 6) + 1;
    setDiceValue(roll);
    setIsRolling(false);

    const activePieces = pieces.filter(p => p.color === players[currentTurn].color);
    if (!activePieces.some(p => canMove(p, roll))) {
      setTimeout(() => {
        setDiceValue(null);
        setCurrentTurn(t => (t + 1) % 4);
      }, 1500);
    }
  };

  const handleMove = async (piece: Piece) => {
    if (isAnimating || diceValue === null) return;
    if (!isHost) { network?.sendAction('MOVE', { id: piece.id }); return; }

    setIsAnimating(true);
    const roll = diceValue;
    const startPos = piece.position;
    const targetPos = startPos === -1 ? 0 : startPos + roll;

    // Visual "Hopping" with Framer Motion
    const steps = startPos === -1 ? 1 : roll;
    for (let i = 1; i <= steps; i++) {
      const newPos = startPos === -1 ? 0 : startPos + i;
      setPieces(prev => prev.map(p => p.id === piece.id ? { ...p, position: newPos } : p));
      audioService.playTick();
      await new Promise(r => setTimeout(r, 150));
    }

    // Capture Logic
    const finalGlobal = targetPos <= 50 ? (START_OFFSETS[piece.color] + targetPos) % 52 : -1;
    const isSafe = [0, 8, 13, 21, 26, 34, 39, 47].includes(finalGlobal) || targetPos > 50;
    
    let bonusTurn = (roll === 6);
    if (!isSafe && finalGlobal !== -1) {
      const victims = pieces.filter(p => 
        p.color !== piece.color && 
        p.position !== -1 && 
        p.position <= 50 && 
        (START_OFFSETS[p.color] + p.position) % 52 === finalGlobal
      );
      if (victims.length > 0) {
        setPieces(prev => prev.map(p => victims.some(v => v.id === p.id) ? { ...p, position: -1 } : p));
        audioService.playCapture();
        bonusTurn = true;
      }
    }

    // Win Condition
    const updatedPieces = pieces.map(p => p.id === piece.id ? { ...p, position: targetPos } : p);
    setPieces(updatedPieces);
    
    if (updatedPieces.filter(p => p.color === piece.color && p.position === 57).length === 4) {
      setWinner(players[currentTurn]);
      setGamePhase('VICTORY');
      onGameEnd?.(players[currentTurn].name);
      return;
    }

    setDiceValue(null);
    setIsAnimating(false);
    if (!bonusTurn) setCurrentTurn(t => (t + 1) % 4);
  };

  // Bot Auto-turn (Host only)
  useEffect(() => {
    if (!isHost || gamePhase !== 'PLAYING' || isAnimating || isRolling) return;
    const active = players[currentTurn];
    if (!active.isBot) return;

    const timer = setTimeout(() => {
      if (diceValue === null) handleRoll();
      else {
        const myPieces = pieces.filter(p => p.color === active.color);
        const aiMove = getSmartAIMove(myPieces, pieces, diceValue, active.color);
        if (aiMove) handleMove(aiMove.piece);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [currentTurn, diceValue, isAnimating, isRolling, isHost, gamePhase, players, pieces]);

  const isMyTurn = players[currentTurn].id === myId;
  const validMoves = isMyTurn && !isAnimating && diceValue !== null 
    ? pieces.filter(p => p.color === players[currentTurn].color && canMove(p, diceValue)).map(p => p.id) 
    : [];

  // Setup Phase
  if (gamePhase === 'SETUP') {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-screen p-4"
      >
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-12 rounded-[3rem] max-w-2xl w-full border border-white/10 shadow-2xl">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="text-center mb-8"
          >
            <UserPlus size={56} className="mx-auto mb-4 text-indigo-400" />
            <h2 className="text-5xl font-black mb-3 bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent uppercase tracking-wider">Ludo Arena</h2>
            <p className="text-slate-400 text-sm uppercase tracking-widest">Select Your Warrior</p>
          </motion.div>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            {players.map((p, i) => (
              <motion.button
                key={p.color}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => network?.sendAction('CLAIM_SEAT', { color: p.color, name: playerName })}
                className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                  p.id === myId 
                    ? 'border-indigo-500 bg-indigo-500/20 shadow-lg shadow-indigo-500/20' 
                    : 'border-slate-700 bg-slate-800/60 hover:border-slate-600 hover:bg-slate-800'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-5xl">{p.avatar}</span>
                <span className="text-sm font-bold text-white truncate w-full uppercase tracking-wide">{p.name}</span>
                {p.isBot && (
                  <span className="text-[10px] text-indigo-400 font-bold uppercase bg-indigo-500/10 px-2 py-1 rounded-full">AI Bot</span>
                )}
              </motion.button>
            ))}
          </div>
          
          {isHost ? (
            <motion.button
              onClick={() => {
                const init: Piece[] = [];
                COLORS.forEach(c => { for(let i=0; i<4; i++) init.push({ id: `${c}-${i}`, color: c, position: -1 }); });
                setPieces(init);
                setGamePhase('PLAYING');
              }}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 rounded-2xl font-black text-xl hover:from-indigo-500 hover:to-purple-500 transition-all uppercase tracking-widest shadow-lg shadow-indigo-500/30"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              🚀 Start Battle
            </motion.button>
          ) : (
            <div className="text-center">
              <motion.div
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="text-slate-400 text-sm font-bold uppercase tracking-widest"
              >
                Waiting for host...
              </motion.div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Victory Phase
  if (gamePhase === 'VICTORY' && winner) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-50"
      >
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', duration: 0.7 }}
          className="bg-gradient-to-br from-yellow-500 via-orange-500 to-red-500 p-12 rounded-[3rem] text-center max-w-lg shadow-2xl"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Trophy size={120} className="mx-auto mb-6 text-white drop-shadow-lg" />
          </motion.div>
          <h2 className="text-6xl font-black text-white mb-4 uppercase tracking-wider drop-shadow-lg">
            Victory!
          </h2>
          <div className="text-7xl mb-6">{winner.avatar}</div>
          <p className="text-3xl font-bold text-white uppercase tracking-wide drop-shadow">
            {winner.name} Wins!
          </p>
          <motion.div
            className="mt-8"
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            <Sparkles size={40} className="mx-auto text-yellow-200" />
          </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  // Playing Phase
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-6 py-6 px-4 min-h-screen"
    >
      {/* Player Indicators */}
      <div className="flex justify-between w-full max-w-3xl gap-4">
        {players.map((p, i) => (
          <motion.div
            key={p.id}
            animate={{ 
              scale: currentTurn === i ? 1.1 : 0.95,
              opacity: currentTurn === i ? 1 : 0.4
            }}
            className="flex flex-col items-center"
          >
            <motion.div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border-4 shadow-lg ${
                i === currentTurn 
                  ? 'bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-400 shadow-indigo-500/50' 
                  : 'bg-slate-800 border-slate-700'
              }`}
              animate={currentTurn === i ? { rotate: [0, 5, -5, 0] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {p.avatar}
            </motion.div>
            <div className="text-xs font-bold text-white mt-2 uppercase tracking-wide">
              {p.name.split(' ')[0]}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Game Board */}
      <LudoBoard 
        pieces={pieces}
        players={players}
        onPieceClick={handleMove}
        validMoves={validMoves}
        movingPieceId={isAnimating ? 'ANY' : null}
        diceValue={diceValue}
      />

      {/* Control Panel */}
      <div className="w-full max-w-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-3xl border border-white/10 flex items-center justify-between shadow-2xl">
        <div className="flex-1">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Status</div>
          <div className="text-2xl font-black text-white uppercase">
            {isMyTurn ? '✨ Your Turn!' : `${players[currentTurn].name}'s Turn`}
          </div>
        </div>
        
        <motion.button 
          onClick={handleRoll}
          disabled={!isMyTurn || diceValue !== null || isRolling || isAnimating}
          className={`w-28 h-28 rounded-3xl flex items-center justify-center shadow-xl border-4 transition-all ${
            !isMyTurn || diceValue !== null || isRolling || isAnimating
              ? 'bg-slate-800 border-slate-700 opacity-30 cursor-not-allowed' 
              : 'bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-400 hover:scale-105 active:scale-95 shadow-indigo-500/30 cursor-pointer'
          }`}
          whileHover={!isMyTurn || diceValue !== null || isRolling || isAnimating ? {} : { scale: 1.05 }}
          whileTap={!isMyTurn || diceValue !== null || isRolling || isAnimating ? {} : { scale: 0.95 }}
          animate={!isMyTurn || diceValue !== null || isRolling || isAnimating ? {} : {
            boxShadow: ['0 0 0 0 rgba(99, 102, 241, 0.4)', '0 0 0 20px rgba(99, 102, 241, 0)']
          }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          {isRolling ? (
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.5, ease: 'linear' }}>
              <Loader2 size={48} className="text-white" />
            </motion.div>
          ) : (
            <span className="text-6xl font-black text-white">
              {diceValue || <Dice5 size={48} />}
            </span>
          )}
        </motion.button>
      </div>

      {/* Instructions */}
      <AnimatePresence>
        {validMoves.length > 0 && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            className="bg-indigo-500/20 border border-indigo-500/30 px-6 py-3 rounded-2xl backdrop-blur-sm"
          >
            <p className="text-indigo-300 font-bold text-sm uppercase tracking-wide">
              👉 Click a glowing piece to move!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default LudoGame;