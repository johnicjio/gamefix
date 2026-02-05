
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameProps } from '../../types';
import { audioService } from '../../services/audioService';
import { Candy, Crown, Play, RefreshCw, Trophy, User, Cpu, Sparkles, ChevronRight, ChevronLeft, Gift, Zap, Skull, Anchor } from 'lucide-react';

const COLORS = ['#ef4444', '#eab308', '#3b82f6', '#22c55e', '#a855f7', '#f97316']; // Red, Yellow, Blue, Green, Purple, Orange
const BOARD_SIZE = 72;

const SPECIAL_SPACES = {
    8: { type: 'SHORTCUT', target: 15, name: 'Peppermint Pass', color: '#fee2e2' },
    24: { type: 'TRAP', duration: 1, name: 'Licorice Lock', color: '#1f2937' },
    35: { type: 'SHORTCUT', target: 45, name: 'Gumdrop Glide', color: '#f3e8ff' },
    52: { type: 'TRAP', duration: 1, name: 'Molasses Mire', color: '#451a03' },
    71: { type: 'GOAL', name: 'King Kandy Castle', color: '#fef3c7' }
};

const LANDMARKS = [
    { pos: 12, icon: '🍭', name: 'Lollypop Woods' },
    { pos: 28, icon: '🍦', name: 'Ice Cream Island' },
    { pos: 42, icon: '🍫', name: 'Choco Canyon' },
    { pos: 60, icon: '🍩', name: 'Donut Desert' }
];

interface Card {
    type: 'SINGLE' | 'DOUBLE' | 'WILD' | 'REVERSE';
    color?: string;
    targetPos?: number;
}

interface CandyPlayer {
    id: string;
    name: string;
    pos: number;
    isBot: boolean;
    avatar: string;
    color: string;
    skipTurns: number;
}

const CandyLandGame: React.FC<GameProps> = ({ playerName, onGameEnd }) => {
    const [phase, setPhase] = useState<'SETUP' | 'PLAYING' | 'WIN'>('SETUP');
    const [players, setPlayers] = useState<CandyPlayer[]>([
        { id: 'p1', name: playerName, pos: 0, isBot: false, avatar: '🤴', color: '#ec4899', skipTurns: 0 },
        { id: 'p2', name: 'Gumdrop Bot', pos: 0, isBot: true, avatar: '🍭', color: '#06b6d4', skipTurns: 0 },
        { id: 'p3', name: 'Mallow Bot', pos: 0, isBot: true, avatar: '☁️', color: '#a855f7', skipTurns: 0 },
        { id: 'p4', name: 'Coco Bot', pos: 0, isBot: true, avatar: '🍫', color: '#f97316', skipTurns: 0 }
    ]);
    const [turn, setTurn] = useState(0);
    const [lastCard, setLastCard] = useState<Card | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [log, setLog] = useState<string[]>(["Welcome to the Great Race!"]);
    const [isMoving, setIsMoving] = useState(false);

    const currentPlayer = players[turn];

    // --- Logic ---
    const drawCard = (): Card => {
        const rand = Math.random();
        // 5% chance for a Wild card (teleport to a landmark)
        if (rand < 0.05) {
            const landmark = LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)];
            return { type: 'WILD', targetPos: landmark.pos };
        }
        // 10% chance for a Reverse (Move back to previous color)
        if (rand < 0.15) {
            return { type: 'REVERSE', color: COLORS[Math.floor(Math.random() * COLORS.length)] };
        }
        // 20% chance for a Double move
        if (rand < 0.35) {
            return { type: 'DOUBLE', color: COLORS[Math.floor(Math.random() * COLORS.length)] };
        }
        // Normal Single move
        return { type: 'SINGLE', color: COLORS[Math.floor(Math.random() * COLORS.length)] };
    };

    const handleDraw = async () => {
        if (isDrawing || isMoving || phase !== 'PLAYING') return;
        
        if (currentPlayer.skipTurns > 0) {
            setLog(prev => [`${currentPlayer.name} is stuck!`, ...prev].slice(0, 3));
            setPlayers(prev => prev.map((p, idx) => idx === turn ? { ...p, skipTurns: p.skipTurns - 1 } : p));
            await new Promise(r => setTimeout(r, 1000));
            setTurn((turn + 1) % players.length);
            return;
        }

        setIsDrawing(true);
        audioService.playRoll();
        
        await new Promise(r => setTimeout(r, 800));
        const card = drawCard();
        setLastCard(card);
        setIsDrawing(false);
        movePlayer(card);
    };

    const movePlayer = async (card: Card) => {
        setIsMoving(true);
        let targetPos = currentPlayer.pos;

        if (card.type === 'WILD' && card.targetPos !== undefined) {
            targetPos = card.targetPos;
            setLog(prev => [`WILD! ${currentPlayer.name} warped!`, ...prev].slice(0, 3));
        } else if (card.type === 'REVERSE') {
            const colorIndex = COLORS.indexOf(card.color!);
            for (let i = currentPlayer.pos - 1; i >= 0; i--) {
                if ((i % COLORS.length) === colorIndex) {
                    targetPos = i;
                    break;
                }
            }
            setLog(prev => [`REVERSE! Move back to ${card.color}`, ...prev].slice(0, 3));
        } else {
            const colorIndex = COLORS.indexOf(card.color!);
            let found = 0;
            const goal = card.type === 'DOUBLE' ? 2 : 1;
            
            for (let i = currentPlayer.pos + 1; i < BOARD_SIZE; i++) {
                if ((i % COLORS.length) === colorIndex) {
                    found++;
                    if (found === goal) {
                        targetPos = i;
                        break;
                    }
                }
            }
            if (found < goal) targetPos = BOARD_SIZE - 1;
        }

        // Animation loop
        const start = currentPlayer.pos;
        const steps = targetPos - start;
        const direction = steps > 0 ? 1 : -1;

        for (let i = 1; i <= Math.abs(steps); i++) {
            const next = start + (i * direction);
            setPlayers(prev => prev.map((p, idx) => idx === turn ? { ...p, pos: next } : p));
            audioService.playTick();
            await new Promise(r => setTimeout(r, 100));
        }

        // Check for Special Spaces (Shortcuts/Traps)
        const special = (SPECIAL_SPACES as any)[targetPos];
        if (special) {
            if (special.type === 'SHORTCUT') {
                setLog(prev => [`Short-cut! Taking ${special.name}`, ...prev].slice(0, 3));
                audioService.playChime();
                await new Promise(r => setTimeout(r, 500));
                // Animate Shortcut
                const jumpSteps = special.target - targetPos;
                for (let i = 1; i <= jumpSteps; i++) {
                    setPlayers(prev => prev.map((p, idx) => idx === turn ? { ...p, pos: targetPos + i } : p));
                    await new Promise(r => setTimeout(r, 50));
                }
                targetPos = special.target;
            } else if (special.type === 'TRAP') {
                setLog(prev => [`TRAP! ${special.name} caught ${currentPlayer.name}`, ...prev].slice(0, 3));
                audioService.playFailure();
                setPlayers(prev => prev.map((p, idx) => idx === turn ? { ...p, skipTurns: special.duration } : p));
            }
        }

        if (targetPos >= BOARD_SIZE - 1) {
            setPhase('WIN');
            audioService.playCelebration();
            if (onGameEnd) onGameEnd(currentPlayer.name);
            return;
        }

        setIsMoving(false);
        setTurn((turn + 1) % players.length);
    };

    useEffect(() => {
        if (currentPlayer.isBot && phase === 'PLAYING' && !isDrawing && !isMoving) {
            const t = setTimeout(handleDraw, 1200);
            return () => clearTimeout(t);
        }
    }, [turn, phase, isDrawing, isMoving]);

    // --- Render Helpers ---
    const boardPath = useMemo(() => {
        const path = [];
        for (let i = 0; i < BOARD_SIZE; i++) {
            const special = (SPECIAL_SPACES as any)[i];
            const landmark = LANDMARKS.find(l => l.pos === i);
            path.push({
                index: i,
                color: COLORS[i % COLORS.length],
                special,
                landmark
            });
        }
        return path;
    }, []);

    const getCellCoords = (index: number) => {
        // Snake/Winding path for 9x8 grid
        const cols = 9;
        const row = Math.floor(index / cols);
        const col = index % cols;
        const x = row % 2 === 0 ? col : (cols - 1) - col;
        const y = 7 - row;
        return { x, y };
    };

    if (phase === 'SETUP') {
        return (
            <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 animate-in fade-in zoom-in duration-500">
                <div className="bg-white/95 text-gray-900 rounded-[3rem] p-8 shadow-2xl max-w-2xl w-full border-8 border-pink-200 relative overflow-hidden font-pixel">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Candy size={120} className="text-pink-500" /></div>
                    <h1 className="text-4xl md:text-5xl font-black text-pink-600 mb-2 uppercase italic text-center drop-shadow-sm">Candy Land</h1>
                    <p className="text-gray-400 text-center font-bold text-[10px] uppercase tracking-[0.4em] mb-8">Enhanced Edition</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                        {players.map((p, i) => (
                            <div key={p.id} className="flex items-center justify-between bg-pink-50/50 p-4 rounded-3xl border-2 border-pink-100/50 transition-all hover:bg-pink-50">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-white shadow-md flex items-center justify-center text-2xl border-2 border-pink-300">{p.avatar}</div>
                                    <div className="flex flex-col">
                                        <input 
                                            value={p.name}
                                            onChange={(e) => setPlayers(prev => prev.map((pl, idx) => idx === i ? {...pl, name: e.target.value} : pl))}
                                            className="font-black text-pink-900 bg-transparent outline-none text-xs w-24"
                                            maxLength={10}
                                        />
                                        <div className="text-[8px] text-pink-400 font-bold uppercase">{p.isBot ? 'Bot Racer' : 'You'}</div>
                                    </div>
                                </div>
                                <button onClick={() => setPlayers(prev => prev.map((pl, idx) => idx === i ? {...pl, isBot: !pl.isBot, name: !pl.isBot ? `Bot ${i+1}` : (i===0 ? playerName : `Player ${i+1}`)} : pl))} className="p-2 hover:bg-pink-100 rounded-xl transition-colors">
                                    {p.isBot ? <Cpu className="text-pink-400" size={18}/> : <User className="text-pink-600" size={18}/>}
                                </button>
                            </div>
                        ))}
                    </div>

                    <button onClick={() => { setPhase('PLAYING'); audioService.playLevelUp(); }} className="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white py-6 rounded-[2rem] font-black text-xl shadow-lg shadow-pink-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-4">
                        <Play fill="currentColor" /> START ADVENTURE
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row items-center justify-center min-h-[85vh] gap-8 p-4 font-pixel select-none">
            <style>{`
                .tile-pop { transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .tile-pop:hover { transform: scale(1.05) translateY(-2px); z-index: 10; }
                .card-flip { transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
            `}</style>

            {/* Path Board */}
            <div className="relative w-full max-w-[650px] aspect-[9/8] bg-white rounded-[3rem] p-6 shadow-2xl border-[12px] border-pink-100 grid grid-cols-9 grid-rows-8 gap-1.5 overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/candy-cane-stripes.png')] opacity-5 pointer-events-none"></div>
                
                {Array.from({ length: 72 }).map((_, i) => {
                    const cell = boardPath.find(c => {
                        const { x, y } = getCellCoords(c.index);
                        const cols = 9;
                        const rowIdx = 7 - y;
                        const colIdx = rowIdx % 2 === 0 ? x : (cols - 1) - x;
                        return (rowIdx * cols + colIdx) === i;
                    });
                    
                    if (!cell) return <div key={i} className="bg-gray-50/50 rounded-xl"></div>;

                    const isGoal = cell.index === BOARD_SIZE - 1;
                    const special = cell.special;
                    const landmark = cell.landmark;

                    return (
                        <div 
                            key={i} 
                            className="relative flex items-center justify-center rounded-xl shadow-[0_3px_0_0_rgba(0,0,0,0.1)] border border-black/5 overflow-hidden tile-pop"
                            style={{ backgroundColor: special ? special.color : cell.color }}
                        >
                            <span className="text-[7px] text-white/30 font-black absolute top-1 left-1">{cell.index}</span>
                            {special?.type === 'SHORTCUT' && <Zap size={14} className="text-yellow-400 drop-shadow-md animate-pulse" />}
                            {special?.type === 'TRAP' && <Anchor size={14} className="text-white/40" />}
                            {landmark && <span className="text-xl drop-shadow-md">{landmark.icon}</span>}
                            {isGoal && <Crown className="text-yellow-400 animate-bounce" size={24} />}
                        </div>
                    );
                })}

                {/* Player Pawns */}
                {players.map((p, i) => {
                    const { x, y } = getCellCoords(p.pos);
                    const cellW = 100 / 9;
                    const cellH = 100 / 8;
                    const offsetX = (i % 2 === 0 ? -12 : 12);
                    const offsetY = (i < 2 ? -12 : 12);
                    return (
                        <div 
                            key={p.id}
                            className="absolute transition-all duration-300 flex items-center justify-center z-30 pointer-events-none"
                            style={{ 
                                width: `${cellW}%`, 
                                height: `${cellH}%`, 
                                left: `${x * cellW}%`, 
                                top: `${y * cellH}%`,
                                transform: `translate(${offsetX}%, ${offsetY}%) scale(1.6)`
                            }}
                        >
                            <div className={`w-10 h-10 rounded-full bg-white shadow-xl border-4 flex items-center justify-center text-2xl relative ${isMoving && turn === i ? 'animate-bounce' : ''}`} style={{ borderColor: p.color }}>
                                {p.avatar}
                                {p.skipTurns > 0 && <Skull className="absolute -top-2 -right-2 text-gray-900 bg-white rounded-full p-0.5" size={16} />}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* HUD / Deck */}
            <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                
                {/* Turn Info */}
                <div className="w-full p-4 bg-gray-900 rounded-3xl border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-3xl border border-white/20 animate-pulse">
                            {currentPlayer.avatar}
                        </div>
                        <div>
                            <div className="text-[10px] font-black text-pink-500 uppercase tracking-widest">Active Racer</div>
                            <div className="text-lg font-black text-white truncate max-w-[120px]">{currentPlayer.name}</div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] font-black text-gray-500 uppercase">Square</div>
                        <div className="text-2xl font-black text-white">{currentPlayer.pos}</div>
                    </div>
                </div>

                {/* Deck Area */}
                <div className="w-full aspect-[4/5] bg-pink-100 rounded-[3.5rem] p-8 shadow-2xl border-8 border-white flex flex-col items-center justify-between relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-2 bg-pink-200/50"></div>
                    <div className="text-[9px] font-black text-pink-500 uppercase tracking-[0.4em] mb-4">Sugar Deck</div>
                    
                    <div className={`relative w-full aspect-[2/3] max-w-[200px] perspective-1000 ${isDrawing ? 'scale-105' : ''} transition-transform`}>
                        {isDrawing ? (
                            <div className="w-full h-full bg-pink-500 rounded-[2.5rem] border-4 border-white flex items-center justify-center shadow-xl animate-spin-slow">
                                <RefreshCw className="text-white animate-spin" size={48} />
                            </div>
                        ) : lastCard ? (
                            <div className={`w-full h-full rounded-[2.5rem] border-4 border-white shadow-2xl flex flex-col items-center justify-center animate-in zoom-in duration-300`} style={{ backgroundColor: lastCard.color || '#fff' }}>
                                <div className="absolute inset-0 bg-white/20 opacity-40 rounded-[2rem]"></div>
                                {lastCard.type === 'SINGLE' && <Candy size={80} className="text-white drop-shadow-lg" />}
                                {lastCard.type === 'DOUBLE' && (
                                    <div className="flex flex-col gap-4">
                                        <Candy size={56} className="text-white drop-shadow-lg" />
                                        <Candy size={56} className="text-white drop-shadow-lg" />
                                    </div>
                                )}
                                {lastCard.type === 'WILD' && (
                                    <div className="flex flex-col items-center gap-4 text-pink-600">
                                        <Sparkles size={64} className="animate-pulse" />
                                        <span className="text-xs font-black text-center uppercase leading-tight">Landmark<br/>Warp!</span>
                                    </div>
                                )}
                                {lastCard.type === 'REVERSE' && (
                                    <div className="flex flex-col items-center gap-4 text-white">
                                        <ChevronLeft size={64} className="animate-bounce" />
                                        <span className="text-[10px] font-black uppercase text-center px-4">Move Back to {lastCard.color}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-pink-400 to-pink-500 rounded-[2.5rem] border-4 border-white shadow-inner flex flex-col items-center justify-center gap-4">
                                <Gift className="text-white/30" size={100} />
                                <div className="text-[8px] font-black text-white/40 uppercase tracking-widest">Draw to move</div>
                            </div>
                        )}
                    </div>

                    <button 
                        onClick={handleDraw} 
                        disabled={currentPlayer.isBot || isDrawing || isMoving || phase === 'WIN'} 
                        className="w-full bg-pink-600 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-lg hover:bg-pink-500 active:scale-95 disabled:opacity-50 transition-all z-10"
                    >
                        DRAW CARD
                    </button>
                </div>

                {/* Scoreboard Miniature */}
                <div className="w-full grid grid-cols-4 gap-2">
                    {players.map((p, i) => (
                        <div key={p.id} className={`p-2 rounded-2xl border-2 flex flex-col items-center gap-1 transition-all ${turn === i ? 'bg-pink-100 border-pink-500 scale-105 shadow-md' : 'bg-gray-100 border-transparent opacity-40'}`}>
                            <span className="text-xl">{p.avatar}</span>
                            <span className="text-[8px] font-black text-gray-800">{p.pos}</span>
                        </div>
                    ))}
                </div>

                {/* Logs */}
                <div className="w-full h-24 bg-pink-50/50 rounded-3xl p-4 overflow-hidden border border-pink-100">
                    {log.map((m, i) => (
                        <div key={i} className={`text-[9px] font-bold italic leading-relaxed animate-in slide-in-from-left-2 ${i === 0 ? 'text-pink-600' : 'text-pink-300'}`}>
                            ✨ {m}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CandyLandGame;
