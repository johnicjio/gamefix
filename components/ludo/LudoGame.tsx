
import React, { useState, useEffect } from 'react';
import LudoBoard from './LudoBoard';
import { LudoColor, Player, Piece, GameProps } from '../../types';
import { canMove, getSmartAIMove } from './ludoLogic';
import { Dice5, Play, RotateCcw, Cpu, User, Check } from 'lucide-react';
import { audioService } from '../../services/audioService';

const COLORS = [LudoColor.GREEN, LudoColor.YELLOW, LudoColor.BLUE, LudoColor.RED];

const BOT_PROFILES: Record<string, { name: string; avatar: string }> = {
    [LudoColor.GREEN]: { name: 'Bot Green', avatar: '🐸' },
    [LudoColor.YELLOW]: { name: 'Bot Yellow', avatar: '🐯' },
    [LudoColor.BLUE]: { name: 'Bot Blue', avatar: '🤖' },
    [LudoColor.RED]: { name: 'Bot Red', avatar: '🦊' },
};

const LudoGame: React.FC<GameProps> = ({ playerName, onGameEnd }) => {
    const [gamePhase, setGamePhase] = useState<'SETUP' | 'PLAYING'>('SETUP');
    const [players, setPlayers] = useState<Player[]>([
        { id: 'p1', name: playerName, color: LudoColor.GREEN, isBot: false, avatar: '🤴' },
        { id: 'p2', name: BOT_PROFILES[LudoColor.YELLOW].name, color: LudoColor.YELLOW, isBot: true, avatar: BOT_PROFILES[LudoColor.YELLOW].avatar },
        { id: 'p3', name: BOT_PROFILES[LudoColor.BLUE].name, color: LudoColor.BLUE, isBot: true, avatar: BOT_PROFILES[LudoColor.BLUE].avatar },
        { id: 'p4', name: BOT_PROFILES[LudoColor.RED].name, color: LudoColor.RED, isBot: true, avatar: BOT_PROFILES[LudoColor.RED].avatar },
    ]);
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [currentTurn, setCurrentTurn] = useState(0);
    const [diceValue, setDiceValue] = useState<number | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [movingPieceId, setMovingPieceId] = useState<string | null>(null);

    const currentPlayer = players[currentTurn];
    const isMyTurn = !currentPlayer.isBot;

    const startNewGame = () => {
        const p: Piece[] = [];
        COLORS.forEach(c => {
            for(let i=0; i<4; i++) p.push({ id: `${c}-${i}`, color: c, position: -1 });
        });
        setPieces(p);
        setCurrentTurn(0);
        setDiceValue(null);
        setGamePhase('PLAYING');
        audioService.playLevelUp();
    };

    const handleColorSelect = (selectedColor: LudoColor) => {
        setPlayers(prev => prev.map(p => {
            // Set the selected color to be the Human Player
            if (p.color === selectedColor) {
                return { ...p, isBot: false, name: playerName, avatar: '🤴' };
            }
            // Reset the previous human player (if it was me) back to a Bot
            if (!p.isBot && p.name === playerName) {
                return { 
                    ...p, 
                    isBot: true, 
                    name: BOT_PROFILES[p.color].name, 
                    avatar: BOT_PROFILES[p.color].avatar 
                };
            }
            return p;
        }));
        audioService.playTick();
    };

    const handleRoll = () => {
        if (isRolling || isMoving || diceValue !== null) return;
        setIsRolling(true);
        audioService.playRoll(); 
        setTimeout(() => {
            const val = Math.floor(Math.random() * 6) + 1;
            setDiceValue(val);
            setIsRolling(false);
            const playerPieces = pieces.filter(p => p.color === currentPlayer.color);
            const canAnyMove = playerPieces.some(p => canMove(p, val));
            
            if (!canAnyMove) {
                setTimeout(() => { 
                    setDiceValue(null); 
                    setCurrentTurn((t) => (t + 1) % 4); 
                }, 1000);
            }
        }, 600);
    };

    const handleMove = async (piece: Piece) => {
        if (isMoving || diceValue === null) return;
        setIsMoving(true);
        setMovingPieceId(piece.id);

        const startPos = piece.position;
        const targetPos = startPos === -1 ? 0 : startPos + (diceValue || 0);
        const steps = targetPos - startPos;

        for (let i = 1; i <= steps; i++) {
            const currentStep = startPos + i;
            setPieces(prev => prev.map(p => p.id === piece.id ? { ...p, position: currentStep } : p));
            audioService.playTick();
            await new Promise(r => setTimeout(r, 180)); // Slightly slower for better animation visibility
        }

        let turnContinues = (diceValue === 6);
        
        // Home Victory Check
        if (targetPos === 57) {
            audioService.playWin();
            turnContinues = true;
            const homeCount = pieces.filter(p => p.color === currentPlayer.color && p.position === 57).length + 1;
            if (homeCount === 4) {
                onGameEnd?.(currentPlayer.name);
                return;
            }
        }

        // Capture Logic
        const globalPos = (targetPos !== -1 && targetPos < 51) 
            ? (({GREEN:0, YELLOW:13, BLUE:26, RED:39} as any)[currentPlayer.color] + targetPos) % 52 
            : -1;
        const safeSpots = [8, 21, 34, 47, 0, 13, 26, 39];

        if (globalPos !== -1 && !safeSpots.includes(globalPos)) {
            const enemies = pieces.filter(p => 
                p.color !== currentPlayer.color && 
                p.position !== -1 && 
                p.position < 51 && 
                (({GREEN:0, YELLOW:13, BLUE:26, RED:39} as any)[p.color] + p.position) % 52 === globalPos
            );
            
            if (enemies.length > 0) {
                audioService.playCapture();
                setPieces(prev => prev.map(p => enemies.find(e => e.id === p.id) ? { ...p, position: -1 } : p));
                turnContinues = true;
            }
        }

        setMovingPieceId(null);
        setIsMoving(false);
        setDiceValue(null);
        if (!turnContinues) {
            setCurrentTurn((t) => (t + 1) % 4);
        }
    };

    useEffect(() => {
        if (gamePhase === 'PLAYING' && currentPlayer.isBot) {
            if (diceValue === null && !isRolling && !isMoving) {
                setTimeout(handleRoll, 1000);
            } else if (diceValue !== null && !isMoving) {
                const move = getSmartAIMove(
                    pieces.filter(p => p.color === currentPlayer.color), 
                    pieces, 
                    diceValue, 
                    currentPlayer.color
                );
                if (move) {
                    setTimeout(() => handleMove(move.piece), 800);
                }
            }
        }
    }, [currentTurn, diceValue, gamePhase, isRolling, isMoving]);

    if (gamePhase === 'SETUP') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in slide-in-from-bottom-10">
                <div className="bg-gray-900 p-8 sm:p-10 rounded-[3rem] border border-gray-800 shadow-2xl max-w-2xl w-full">
                    <h2 className="text-3xl font-black text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 uppercase tracking-widest font-pixel">Arena Setup</h2>
                    
                    {/* Color Selection */}
                    <div className="mb-10">
                        <div className="text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">CHOOSE YOUR TEAM</div>
                        <div className="flex justify-center gap-4">
                            {COLORS.map((c) => {
                                const p = players.find(pl => pl.color === c);
                                const isMe = p && !p.isBot && p.name === playerName;
                                
                                const bgColors = {
                                    [LudoColor.GREEN]: 'bg-green-500 hover:bg-green-400',
                                    [LudoColor.YELLOW]: 'bg-yellow-400 hover:bg-yellow-300',
                                    [LudoColor.BLUE]: 'bg-blue-500 hover:bg-blue-400',
                                    [LudoColor.RED]: 'bg-red-500 hover:bg-red-400',
                                };

                                return (
                                    <button
                                        key={c}
                                        onClick={() => handleColorSelect(c)}
                                        className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all shadow-lg border-4 
                                            ${isMe ? 'scale-110 ring-4 ring-white border-white' : 'scale-100 opacity-60 hover:opacity-100 border-transparent'}
                                            ${bgColors[c]}
                                        `}
                                    >
                                        {isMe ? '🤴' : BOT_PROFILES[c].avatar}
                                        {isMe && <div className="absolute -top-2 -right-2 bg-white text-black p-0.5 rounded-full"><Check size={12} strokeWidth={4}/></div>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Player Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-10">
                        {players.map((p, i) => (
                            <div key={p.color} className={`p-4 rounded-[2rem] border-2 flex flex-col items-center gap-2 transition-all ${p.isBot ? 'bg-gray-800/30 border-gray-800' : 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10'}`}>
                                <div className="text-2xl">{p.avatar}</div>
                                <div className="font-bold text-[10px] truncate w-full text-center uppercase tracking-widest text-gray-400">{p.name}</div>
                                <button 
                                    onClick={() => setPlayers(prev => prev.map((pl, idx) => idx === i ? { ...pl, isBot: !pl.isBot, name: !pl.isBot ? playerName : BOT_PROFILES[pl.color].name, avatar: !pl.isBot ? '🤴' : BOT_PROFILES[pl.color].avatar } : pl))}
                                    className="text-[9px] font-black uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full hover:bg-black/60 transition-colors"
                                >
                                    {p.isBot ? <span className="flex items-center gap-1"><Cpu size={12}/> BOT</span> : <span className="flex items-center gap-1"><User size={12}/> HUMAN</span>}
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={startNewGame}
                        className="w-full bg-white text-black font-black py-5 rounded-[2rem] text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 font-pixel"
                    >
                        <Play fill="currentColor"/> START MATCH
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-8 max-w-full animate-in fade-in duration-500">
            <div className="flex justify-between w-full max-w-[500px] mb-4 px-4">
                {players.map((p, i) => (
                    <div key={p.color} className={`flex flex-col items-center transition-all duration-300 ${currentTurn === i ? 'scale-110 opacity-100' : 'opacity-40 grayscale'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg border-2 ${i === currentTurn ? 'bg-indigo-600 border-indigo-400 ring-4 ring-indigo-500/20' : 'bg-gray-800 border-gray-700'}`}>
                            {p.avatar}
                        </div>
                        <div className="text-[8px] font-black uppercase mt-2 tracking-widest text-gray-500">{p.name.split(' ')[0]}</div>
                    </div>
                ))}
            </div>

            <div className="px-2 w-full flex justify-center">
                <LudoBoard 
                    pieces={pieces} 
                    players={players} 
                    validMoves={!isMoving && diceValue && isMyTurn ? pieces.filter(p => p.color === currentPlayer.color && canMove(p, diceValue)).map(p => p.id) : []}
                    onPieceClick={handleMove}
                    movingPieceId={movingPieceId}
                    diceValue={diceValue}
                />
            </div>

            <div className="flex items-center gap-6 bg-gray-900 p-8 rounded-[3rem] border border-gray-800 shadow-xl w-full max-w-[500px]">
                <div className="flex-1">
                    <div className="text-[9px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2">Turn Status</div>
                    <div className="text-lg font-black flex items-center gap-2 text-white">
                        {currentPlayer.avatar} {currentPlayer.name.split(' ')[0]}
                    </div>
                </div>
                <button 
                    onClick={handleRoll}
                    disabled={!isMyTurn || diceValue !== null || isRolling || isMoving}
                    className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center shadow-2xl transition-all active:scale-90 font-pixel
                        ${diceValue !== null ? 'bg-white text-black ring-4 ring-indigo-500/30 scale-105' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
                        disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed
                    `}
                >
                    {isRolling ? <RotateCcw className="animate-spin" size={32}/> : (diceValue ? <span className="text-4xl font-black">{diceValue}</span> : <Dice5 size={40}/>)}
                </button>
            </div>
        </div>
    );
};

export default LudoGame;
