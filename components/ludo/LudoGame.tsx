
import React, { useState, useEffect } from 'react';
import LudoBoard from './LudoBoard';
import { LudoColor, Player, Piece, GameProps } from '../../types';
import { canMove, getSmartAIMove } from './ludoLogic';
import { Dice5, Play, RotateCcw, Cpu, User, Check, Loader2, Wifi, WifiOff, MousePointer2 } from 'lucide-react';
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
    const isConnected = network?.isConnected ?? false;
    const isOfflineMode = !network || network.role === 'OFFLINE' || (network.role === 'HOST' && !isConnected);

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

    // Identify which player ID belongs to "Me"
    const myPlayerId = isHost ? players[0].id : (players.find(p => p.name === playerName && !p.isBot)?.id || null);

    // --- State Persistence ---
    useEffect(() => {
        if (isOfflineMode) {
            const savedState = localStorage.getItem('ludo_game_state');
            if (savedState) {
                try {
                    const parsed = JSON.parse(savedState);
                    if (parsed.gamePhase === 'PLAYING') {
                        setGamePhase('PLAYING');
                        setPlayers(parsed.players);
                        setPieces(parsed.pieces);
                        setCurrentTurn(parsed.currentTurn);
                        setDiceValue(parsed.diceValue);
                    }
                } catch (e) {
                    console.error("Failed to load saved game", e);
                }
            }
        }
    }, []);

    useEffect(() => {
        if (isOfflineMode && gamePhase === 'PLAYING') {
            const stateToSave = { gamePhase, players, pieces, currentTurn, diceValue };
            localStorage.setItem('ludo_game_state', JSON.stringify(stateToSave));
        }
    }, [gamePhase, players, pieces, currentTurn, diceValue, isOfflineMode]);

    // --- Networking Hooks ---
    useEffect(() => {
        if (network) {
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
            else if (isHost) {
                network.onActionReceived((action, payload) => {
                    if (action === 'ROLL') {
                        handleRoll();
                    } else if (action === 'MOVE') {
                        const piece = pieces.find(p => p.id === payload.pieceId);
                        if (piece) handleMove(piece);
                    } else if (action === 'CLAIM_SEAT') {
                        // Guest wants to take a specific color
                        const { color, name } = payload;
                        setPlayers(prev => prev.map(p => {
                            if (p.color === color) {
                                return { ...p, name, isBot: false, avatar: '👤', id: `guest-${Date.now()}` };
                            }
                            // If Guest switches seats, reset their old seat to bot
                            if (p.name === name && p.color !== color) {
                                return { ...p, ...BOT_PROFILES[p.color], isBot: true, id: `bot-${p.color}` };
                            }
                            return p;
                        }));
                    }
                });
            }
        }
    }, [network, pieces, isHost, isGuest]);

    // Broadcast State (Host Only)
    useEffect(() => {
        if (isHost && network && !isOfflineMode) {
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
    }, [isHost, pieces, currentTurn, diceValue, isRolling, isMoving, movingPieceId, gamePhase, isOfflineMode, network, players]);

    const claimSeat = (color: LudoColor) => {
        if (gamePhase !== 'SETUP') return;
        
        if (isHost) {
            // Host swapping their own seat or configuring bots
            setPlayers(prev => prev.map(p => {
                if (p.color === color) {
                    // If taking a bot seat
                    if (p.isBot) return { ...p, name: playerName, isBot: false, avatar: '🤴', id: 'p1' };
                    // If clicking own seat (toggle back to bot? Optional, keeping simple for now)
                    return p; 
                }
                // If Host moves, free up old seat
                if (p.name === playerName && p.color !== color) {
                    return { ...p, ...BOT_PROFILES[p.color], isBot: true, id: `bot-${p.color}` };
                }
                return p;
            }));
        } else if (isGuest && isConnected) {
            // Send request to host
            network?.sendAction('CLAIM_SEAT', { color, name: playerName });
        }
    };

    const startNewGame = () => {
        localStorage.removeItem('ludo_game_state');
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

    const currentPlayer = players[currentTurn];
    
    // Authorization: Is it "My" turn to interact?
    // If Offline: I can control any non-bot (Hotseat) or just P1. Assuming P1 for now.
    // If Host: I control P1 or any player named "PlayerName"
    // If Guest: I control any player named "PlayerName"
    
    const isMyTurn = !currentPlayer.isBot && currentPlayer.name === playerName;
    
    const handleRoll = () => {
        if (isGuest && isConnected) {
            if (!isMyTurn) return;
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
        if (isGuest && isConnected) {
            if (!isMyTurn) return;
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
                localStorage.removeItem('ludo_game_state');
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
        // Run AI logic if it's a Bot's turn (Host handles this)
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
    }, [currentTurn, diceValue, gamePhase, isRolling, isMoving, isHost, currentPlayer]);

    if (gamePhase === 'SETUP') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in slide-in-from-bottom-10">
                <div className="bg-gray-900 p-8 sm:p-10 rounded-[3rem] border border-gray-800 shadow-2xl max-w-2xl w-full">
                    <h2 className="text-3xl font-black text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 uppercase tracking-widest font-pixel">Arena Setup</h2>
                    <p className="text-center text-gray-500 text-xs mb-8 font-bold uppercase tracking-wider">Select your color to join</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-10">
                        {players.map((p, i) => {
                             const isMe = p.name === playerName;
                             const colorMap = {
                                 [LudoColor.GREEN]: 'border-green-500 bg-green-900/20 text-green-400',
                                 [LudoColor.YELLOW]: 'border-yellow-500 bg-yellow-900/20 text-yellow-400',
                                 [LudoColor.BLUE]: 'border-blue-500 bg-blue-900/20 text-blue-400',
                                 [LudoColor.RED]: 'border-red-500 bg-red-900/20 text-red-400',
                             };
                             
                             return (
                                <button 
                                    key={p.color} 
                                    onClick={() => claimSeat(p.color)}
                                    className={`relative p-4 rounded-[2rem] border-2 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95 group
                                        ${colorMap[p.color]}
                                        ${isMe ? 'ring-2 ring-white shadow-xl' : 'opacity-80 hover:opacity-100'}
                                    `}
                                >
                                    <div className="text-2xl">{p.avatar}</div>
                                    <div className="font-bold text-[10px] truncate w-full text-center uppercase tracking-widest text-gray-300">{p.name}</div>
                                    <div className="text-[9px] font-black uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full flex items-center gap-1">
                                        {p.isBot ? <Cpu size={10} /> : <User size={10} />}
                                        {p.isBot ? 'OPEN' : (isMe ? 'YOU' : 'TAKEN')}
                                    </div>
                                    {p.isBot && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 rounded-[2rem] transition-opacity">
                                            <span className="text-[10px] font-bold text-white uppercase tracking-widest flex items-center gap-1">
                                                <MousePointer2 size={12}/> SELECT
                                            </span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {isHost ? (
                        <button 
                            onClick={startNewGame}
                            className="w-full bg-white text-black font-black py-5 rounded-[2rem] text-xl shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 font-pixel"
                        >
                            <Play fill="currentColor"/> START MATCH
                        </button>
                    ) : (
                        <div className="text-center text-gray-500 animate-pulse font-pixel text-xs bg-gray-800 p-4 rounded-xl">
                            Waiting for Host to Start...
                        </div>
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
                        {currentPlayer.isBot && !isRolling && !isMoving && (
                            <span className="flex items-center gap-2 text-[10px] text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20 animate-pulse ml-2 tracking-widest">
                                <Loader2 size={10} className="animate-spin"/> THINKING
                            </span>
                        )}
                        {!isOfflineMode && network && !isMyTurn && !currentPlayer.isBot && (
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
