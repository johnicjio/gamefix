
import React, { useState, useEffect } from 'react';
import LudoBoard from './LudoBoard';
import { LudoColor, Player, Piece, GameProps } from '../../types';
import { canMove, getSmartAIMove } from './ludoLogic';
import { Dice5, Play, RotateCcw, Cpu, User, Check, Loader2, Wifi } from 'lucide-react';
import { audioService } from '../../services/audioService';

const COLORS = [LudoColor.GREEN, LudoColor.YELLOW, LudoColor.BLUE, LudoColor.RED];

const BOT_PROFILES: Record<string, { name: string; avatar: string }> = {
    [LudoColor.GREEN]: { name: 'Bot Green', avatar: '🐸' },
    [LudoColor.YELLOW]: { name: 'Bot Yellow', avatar: '🐯' },
    [LudoColor.BLUE]: { name: 'Bot Blue', avatar: '🤖' },
    [LudoColor.RED]: { name: 'Bot Red', avatar: '🦊' },
};

const LudoGame: React.FC<GameProps> = ({ playerName, onGameEnd, network }) => {
    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';

    const [gamePhase, setGamePhase] = useState<'SETUP' | 'PLAYING'>('SETUP');
    const [players, setPlayers] = useState<Player[]>([
        { id: 'p1', name: playerName, color: LudoColor.GREEN, isBot: false, avatar: '🤴' },
        { id: 'p2', name: isGuest ? 'Opponent' : 'Bot Yellow', color: LudoColor.YELLOW, isBot: !isGuest, avatar: isGuest ? '👤' : '🐯' },
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
    
    // Authorization Logic
    // Local: !isBot. Host: Me (Green) or Bots. Guest: Me (Yellow).
    const isMyTurn = isHost 
        ? (!currentPlayer.isBot && currentPlayer.color === LudoColor.GREEN) // Host controls Green
        : (!currentPlayer.isBot && currentPlayer.color === LudoColor.YELLOW); // Guest controls Yellow

    const isBotThinking = currentPlayer.isBot && !isRolling && !isMoving;

    // --- Networking Hooks ---
    useEffect(() => {
        if (network) {
            // Guest Listeners
            if (isGuest) {
                network.onStateUpdate((state) => {
                    setGamePhase(state.gamePhase);
                    setPlayers(state.players);
                    setPieces(state.pieces);
                    setCurrentTurn(state.currentTurn);
                    setDiceValue(state.diceValue);
                    setIsRolling(state.isRolling);
                    setIsMoving(state.isMoving);
                    setMovingPieceId(state.movingPieceId);
                });
            } 
            // Host Action Listeners
            else if (isHost) {
                network.onActionReceived((action, payload) => {
                    if (action === 'ROLL') {
                        handleRoll();
                    } else if (action === 'MOVE') {
                        const piece = pieces.find(p => p.id === payload.pieceId);
                        if (piece) handleMove(piece);
                    } else if (action === 'SETUP_READY') {
                        startNewGame();
                    }
                });
            }
        }
    }, [network, pieces, isHost, isGuest]);

    // Broadcast State (Host Only)
    useEffect(() => {
        if (isHost && network && gamePhase === 'PLAYING') {
            network.broadcastState({
                gamePhase,
                players,
                pieces,
                currentTurn,
                diceValue,
                isRolling,
                isMoving,
                movingPieceId
            });
        }
    }, [isHost, pieces, currentTurn, diceValue, isRolling, isMoving, movingPieceId, gamePhase]);

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

    // Only Host runs logic. Guest sends actions.
    const handleRoll = () => {
        if (isGuest) {
            network?.sendAction('ROLL');
            return;
        }

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
        if (isGuest) {
            network?.sendAction('MOVE', { pieceId: piece.id });
            return;
        }

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
            await new Promise(r => setTimeout(r, 180));
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
        if (isHost && gamePhase === 'PLAYING' && currentPlayer.isBot) {
            if (diceValue === null && !isRolling && !isMoving) {
                setTimeout(handleRoll, 1500);
            } else if (diceValue !== null && !isMoving) {
                const move = getSmartAIMove(
                    pieces.filter(p => p.color === currentPlayer.color), 
                    pieces, 
                    diceValue, 
                    currentPlayer.color
                );
                if (move) {
                    setTimeout(() => handleMove(move.piece), 1200);
                }
            }
        }
    }, [currentTurn, diceValue, gamePhase, isRolling, isMoving, isHost]);

    if (gamePhase === 'SETUP') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in slide-in-from-bottom-10">
                <div className="bg-gray-900 p-8 sm:p-10 rounded-[3rem] border border-gray-800 shadow-2xl max-w-2xl w-full">
                    <h2 className="text-3xl font-black text-center mb-8 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 uppercase tracking-widest font-pixel">Arena Setup</h2>
                    
                    {/* Setup is simplified for Multiplayer for now: Fixed slots */}
                    <div className="grid grid-cols-2 gap-4 mb-10">
                        {players.map((p, i) => (
                            <div key={p.color} className={`p-4 rounded-[2rem] border-2 flex flex-col items-center gap-2 transition-all 
                                ${p.color === LudoColor.GREEN ? 'bg-green-900/20 border-green-500' : 
                                  p.color === LudoColor.YELLOW ? 'bg-yellow-900/20 border-yellow-500' : 'bg-gray-800/30 border-gray-800'}
                            `}>
                                <div className="text-2xl">{p.avatar}</div>
                                <div className="font-bold text-[10px] truncate w-full text-center uppercase tracking-widest text-gray-400">{p.name}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full">
                                    {isGuest && i === 1 ? 'YOU' : (i === 0 ? (isGuest ? 'HOST' : 'YOU') : (p.isBot ? 'BOT' : 'PLAYER'))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {isHost ? (
                        <button 
                            onClick={startNewGame}
                            className="w-full bg-white text-black font-black py-5 rounded-[2rem] text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 font-pixel"
                        >
                            <Play fill="currentColor"/> START MATCH
                        </button>
                    ) : (
                        <div className="text-center text-gray-500 animate-pulse font-pixel text-xs">Waiting for Host to Start...</div>
                    )}
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
                        {isBotThinking && (
                            <span className="flex items-center gap-2 text-[10px] text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 animate-pulse ml-2 tracking-widest">
                                <Loader2 size={10} className="animate-spin"/> THINKING
                            </span>
                        )}
                        {network && !isMyTurn && !currentPlayer.isBot && (
                            <span className="flex items-center gap-2 text-[10px] text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 animate-pulse ml-2 tracking-widest">
                                <Wifi size={10} /> REMOTE
                            </span>
                        )}
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
