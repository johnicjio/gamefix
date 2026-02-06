
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameProps, CrushCell } from '../../types';
import { audioService } from '../../services/audioService';
import { Zap, Timer, Trophy, Sparkles, Loader2 } from 'lucide-react';

const GRID_SIZE = 8;
const COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#a855f7']; // Pink, Blue, Green, Amber, Purple
const MATCH_THRESHOLD = 3;

const NeonCrushGame: React.FC<GameProps> = ({ network, playerName, onGameEnd }) => {
  const [grid, setGrid] = useState<CrushCell[][]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [selected, setSelected] = useState<{x: number, y: number} | null>(null);
  const [phase, setPhase] = useState<'IDLE' | 'PLAYING' | 'SYNCING'>('IDLE');
  
  const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
  const isConnected = network?.isConnected ?? false;
  const myId = network?.myId || 'HOST';

  // Systematic Grid Generation
  const generateGrid = useCallback(() => {
    const newGrid: CrushCell[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      newGrid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        newGrid[y][x] = { id: `${x}-${y}-${Date.now()}`, type: Math.floor(Math.random() * COLORS.length), x, y };
      }
    }
    return newGrid;
  }, []);

  useEffect(() => {
    if (isHost && phase === 'IDLE') {
      const initialGrid = generateGrid();
      setGrid(initialGrid);
    }
  }, [isHost, phase, generateGrid]);

  // Network Sync
  useEffect(() => {
    if (network) {
      if (isHost) {
        network.onActionReceived((action, payload) => {
          if (action === 'SWAP') {
            handleSwap(payload.p1, payload.p2);
          } else if (action === 'START') {
            setPhase('PLAYING');
            setTimeLeft(60);
            setScore(0);
          }
        });
      } else {
        network.onStateUpdate((state) => {
          setGrid(state.grid);
          setScore(state.score);
          setTimeLeft(state.timeLeft);
          setPhase(state.phase);
        });
      }
    }
  }, [network, isHost]);

  useEffect(() => {
    if (isHost && network && isConnected) {
      network.broadcastState({ grid, score, timeLeft, phase });
    }
  }, [grid, score, timeLeft, phase, isHost, network, isConnected]);

  // Timer
  useEffect(() => {
    if (phase === 'PLAYING' && timeLeft > 0 && isHost) {
      const timer = setInterval(() => setTimeLeft(t => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && phase === 'PLAYING' && isHost) {
      setPhase('IDLE');
      if (onGameEnd) onGameEnd(score.toString() + " Points");
    }
  }, [phase, timeLeft, isHost, score, onGameEnd]);

  const findMatches = (currentGrid: CrushCell[][]) => {
    const matches: {x: number, y: number}[] = [];
    // Horizontal
    for (let y = 0; y < GRID_SIZE; y++) {
      let count = 1;
      for (let x = 1; x < GRID_SIZE; x++) {
        if (currentGrid[y][x].type === currentGrid[y][x - 1].type) {
          count++;
        } else {
          if (count >= MATCH_THRESHOLD) {
            for (let i = 1; i <= count; i++) matches.push({x: x - i, y});
          }
          count = 1;
        }
      }
      if (count >= MATCH_THRESHOLD) {
        for (let i = 1; i <= count; i++) matches.push({x: GRID_SIZE - i, y});
      }
    }
    // Vertical
    for (let x = 0; x < GRID_SIZE; x++) {
      let count = 1;
      for (let y = 1; y < GRID_SIZE; y++) {
        if (currentGrid[y][x].type === currentGrid[y - 1][x].type) {
          count++;
        } else {
          if (count >= MATCH_THRESHOLD) {
            for (let i = 1; i <= count; i++) matches.push({x, y: y - i});
          }
          count = 1;
        }
      }
      if (count >= MATCH_THRESHOLD) {
        for (let i = 1; i <= count; i++) matches.push({x, y: GRID_SIZE - i});
      }
    }
    return matches;
  };

  const handleSwap = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
    if (!isHost) {
      network?.sendAction('SWAP', { p1, p2 });
      return;
    }

    const newGrid = grid.map(row => [...row]);
    const temp = newGrid[p1.y][p1.x].type;
    newGrid[p1.y][p1.x].type = newGrid[p2.y][p2.x].type;
    newGrid[p2.y][p2.x].type = temp;

    const matches = findMatches(newGrid);
    if (matches.length > 0) {
      audioService.playCorrect();
      // Apply match logic
      let currentScoreAdd = matches.length * 10;
      setScore(s => s + currentScoreAdd);
      
      // Clear matches and drop
      matches.forEach(m => {
        newGrid[m.y][m.x].type = -1; // -1 means empty
      });

      // Drop items
      for (let x = 0; x < GRID_SIZE; x++) {
        let emptyCount = 0;
        for (let y = GRID_SIZE - 1; y >= 0; y--) {
          if (newGrid[y][x].type === -1) {
            emptyCount++;
          } else if (emptyCount > 0) {
            newGrid[y + emptyCount][x].type = newGrid[y][x].type;
            newGrid[y][x].type = -1;
          }
        }
        for (let i = 0; i < emptyCount; i++) {
          newGrid[i][x].type = Math.floor(Math.random() * COLORS.length);
        }
      }
      setGrid(newGrid);
    } else {
      audioService.playFailure();
    }
  };

  const handleCellClick = (x: number, y: number) => {
    if (phase !== 'PLAYING') return;
    if (!selected) {
      setSelected({x, y});
      audioService.playTick();
    } else {
      const dist = Math.abs(selected.x - x) + Math.abs(selected.y - y);
      if (dist === 1) {
        handleSwap(selected, {x, y});
      }
      setSelected(null);
    }
  };

  if (phase === 'IDLE') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in">
        <div className="bg-gray-900 p-12 rounded-[3rem] border-2 border-indigo-500/30 text-center shadow-2xl relative overflow-hidden">
          <Zap size={64} className="text-yellow-400 mx-auto mb-6 animate-pulse" />
          <h1 className="text-4xl font-black mb-2 italic font-pixel uppercase">Crush Rush</h1>
          <p className="text-gray-500 mb-10 text-xs tracking-widest uppercase">CO-OP PUZZLE MAYHEM</p>
          <div className="text-3xl font-black text-white mb-8">LAST SCORE: {score}</div>
          {isHost ? (
            <button onClick={() => { setPhase('PLAYING'); setTimeLeft(60); setScore(0); network?.sendAction('START'); }} className="w-full bg-white text-black py-5 rounded-2xl font-black text-xl hover:bg-gray-200 uppercase transition-all">INITIALIZE</button>
          ) : <div className="text-gray-500 animate-pulse uppercase text-xs font-black">Awaiting Host Command...</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 max-w-2xl mx-auto py-8 select-none touch-none">
      <div className="w-full flex justify-between items-center bg-gray-900/80 p-6 rounded-[2.5rem] border-2 border-indigo-500/20 shadow-xl">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Energy</span>
          <span className="text-4xl font-black text-white font-mono">{score.toString().padStart(5, '0')}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Time Remaining</span>
          <span className={`text-4xl font-black font-mono ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</span>
        </div>
      </div>

      <div className="relative bg-gray-900 p-4 rounded-[3rem] border-4 border-gray-800 shadow-2xl overflow-hidden">
        <div className="grid grid-cols-8 gap-2">
          {grid.map((row, y) => row.map((cell, x) => (
            <button
              key={cell.id}
              onClick={() => handleCellClick(x, y)}
              className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl border-2 transition-all transform active:scale-95 flex items-center justify-center
                ${selected?.x === x && selected?.y === y ? 'border-white scale-110 shadow-[0_0_20px_rgba(255,255,255,0.4)] z-10' : 'border-black/20 hover:border-white/10'}
              `}
              style={{ backgroundColor: cell.type === -1 ? 'transparent' : `${COLORS[cell.type]}44`, borderColor: COLORS[cell.type] }}
            >
              {cell.type !== -1 && <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-white/60 blur-[1px] shadow-[0_0_10px_white]"></div>}
            </button>
          )))}
        </div>
      </div>

      <div className="flex items-center gap-4 text-[9px] font-black text-gray-600 uppercase tracking-[0.3em]">
        <Sparkles size={14}/> Work together to match 3 or more!
      </div>
    </div>
  );
};

export default NeonCrushGame;
