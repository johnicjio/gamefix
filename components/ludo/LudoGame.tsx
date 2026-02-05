
import React, { useState, useEffect, useRef } from 'react';
import LudoBoard from './LudoBoard';
import { LudoColor, Player, Piece, GameProps } from '../../types';
import { canMove, getSmartAIMove } from './ludoLogic';
import { Dice5, Play, RotateCcw, Cpu, User, ChevronRight } from 'lucide-react';
import { audioService } from '../../services/audioService';

const COLORS = [LudoColor.GREEN, LudoColor.YELLOW, LudoColor.BLUE, LudoColor.RED];

const LudoGame: React.FC<GameProps> = ({ playerName, onGameEnd }) => {
    const [gamePhase, setGamePhase] = useState<'SETUP' | 'PLAYING'>('SETUP');
    const [players, setPlayers] = useState<Player[]>([
        { id: 'p1', name: playerName, color: LudoColor.GREEN, isBot: false, avatar: '🤴' },
        { id: 'p2', name: 'Bot Yellow', color: LudoColor.YELLOW, isBot: true, avatar: '🐯' },
        { id: 'p3', name: 'Bot Blue', color: LudoColor.BLUE, isBot: true, avatar: '🤖' },
        { id: 'p4', name: 'Bot Red', color: LudoColor.RED, isBot: true, avatar: '🦊' },
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

    const handleRoll = () => {
        if (isRolling || isMoving || diceValue !== null) return;
        setIsRolling(true);
        audioService.playRoll(); 
        setTimeout(() => {
            const val = Math.floor(Math.random() * 6) + 1;
            setDiceValue(val);
            setIsRolling(false);
            const canAnyMove = pieces.filter(p => p.color === currentPlayer.color).some(p => canMove(p, val));
            if (!canAnyMove) setTimeout(() => { setDiceValue(null); setCurrentTurn((t) => (t + 1) % 4); }, 1000);
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
            await new Promise(r => setTimeout(r, 150)); 
        }

        // Logic for Capture & Home
        let turnContinues = (diceValue === 6);
        if (targetPos === 57) {
            audioService.playCelebration();
            turnContinues = true;
            if (pieces.filter(p => p.color === currentPlayer.color && p.position === 57).length === 3) {
                onGameEnd?.(currentPlayer.name);
                return;
            }
        }

        // Capture check
        const globalPos = (targetPos !== -1 && targetPos < 51) ? (({GREEN:0, YELLOW:13, BLUE:26, RED:39} as any)[currentPlayer.color] + targetPos) % 52 : -1;
        const safeSpots = [8, 21, 34, 47, 0, 13, 26, 39];
        if (globalPos !== -1 && !safeSpots.includes(globalPos)) {
            const enemies = pieces.filter(p => p.color !== currentPlayer.color && p.position !== -1 && p.position < 51 && (({GREEN:0, YELLOW:13, BLUE:26, RED:39} as any)[p.color] + p.position) % 52 === globalPos);
            if (enemies.length > 0) {
                audioService.playCapture();
                setPieces(prev => prev.map(p => enemies.find(e => e.id === p.id) ? { ...p, position: -1 } : p));
                turnContinues = true;
            }
        }

        setMovingPieceId(null);
        setIsMoving(false);
        setDiceValue(null);
        if (!turnContinues) setCurrentTurn((t) => (t + 1) % 4);
    };

    useEffect(() => {
        if (gamePhase === 'PLAYING' && currentPlayer.isBot) {
            if (diceValue === null && !isRolling && !isMoving) setTimeout(handleRoll, 1000);
            else if (diceValue !== null && !isMoving) {
                const move = getSmartAIMove(pieces.filter(p => p.color === currentPlayer.color), pieces, diceValue, currentPlayer.color);
                if (move) setTimeout(() => handleMove(move.piece), 800);
            }
        }
    }, [currentTurn, diceValue, gamePhase, isRolling, isMoving]);

    if (gamePhase === 'SETUP') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in slide-in-from-bottom-10">
                <div className="bg-gray-900 p-10 rounded-[3rem] border border-gray-800 shadow-2xl max-w-2xl w-full">
                    <h2 className="text-3xl font-black text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 uppercase tracking-widest">Setup Players</h2>
                    <div className="grid grid-cols-2 gap-4 mb-10">
                        {players.map((p, i) => (
                            <div key={p.color} className={`p-6 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${p.isBot ? 'bg-gray-800/50 border-gray-700' : 'bg-indigo-600/10 border-indigo-500 shadow-lg shadow-indigo-500/10'}`}>
                                <div className="text-3xl mb-2">{p.avatar}</div>
                                <div className="font-bold text-sm truncate w-full text-center">{p.name}</div>
                                <button 
                                    onClick={() => setPlayers(prev => prev.map((pl, idx) => idx === i ? { ...pl, isBot: !pl.isBot, name: !pl.isBot ? 'Player ' + (i+1) : 'Bot ' + pl.color } : pl))}
                                    className="text-[10px] font-black uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full hover:bg-black/60"
                                >
                                    {p.isBot ? <span className="flex items-center gap-1"><Cpu size={12}/> AI BOT</span> : <span className="flex items-center gap-1"><User size={12}/> HUMAN</span>}
                                </button>
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={startNewGame}
                        className="w-full bg-white text-black font-black py-5 rounded-[2rem] text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <Play fill="currentColor"/> START ARENA
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-8">
            <div className="flex justify-between w-full max-w-[500px] mb-4">
                {players.map((p, i) => (
                    <div key={p.color} className={`flex flex-col items-center transition-all ${currentTurn === i ? 'scale-110' : 'opacity-40 grayscale'}`}>
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg ${i === currentTurn ? 'bg-indigo-600 ring-4 ring-indigo-500/20' : 'bg-gray-800'}`}>
                            {p.avatar}
                        </div>
                        <div className="text-[8px] font-black uppercase mt-2 tracking-widest text-gray-500">{p.name.split(' ')[0]}</div>
                    </div>
                ))}
            </div>

            <LudoBoard 
                pieces={pieces} 
                players={players} 
                validMoves={!isMoving && diceValue && isMyTurn ? pieces.filter(p => p.color === currentPlayer.color && canMove(p, diceValue)).map(p => p.id) : []}
                onPieceClick={handleMove}
                movingPieceId={movingPieceId}
            />

            <div className="flex items-center gap-10 bg-gray-900 p-8 rounded-[3rem] border border-gray-800 shadow-xl w-full max-w-[500px]">
                <div className="flex-1">
                    <div className="text-[10px] font-black uppercase tracking-[0.4em] text-gray-500 mb-2">Turn Status</div>
                    <div className="text-xl font-bold flex items-center gap-2">
                        {currentPlayer.avatar} {currentPlayer.name}
                    </div>
                </div>
                <button 
                    onClick={handleRoll}
                    disabled={!isMyTurn || diceValue !== null || isRolling || isMoving}
                    className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all active:scale-90 
                        ${diceValue !== null ? 'bg-white text-black ring-4 ring-indigo-500/30' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}
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
