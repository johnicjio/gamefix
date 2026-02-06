
import React, { useState, useEffect } from 'react';
import LudoBoard from './LudoBoard';
import { LudoColor, Player, Piece, GameProps } from '../../types';
import { canMove } from './ludoLogic';
import { Dice5, Play, RotateCcw, Loader2, MousePointer2 } from 'lucide-react';
import { audioService } from '../../services/audioService';

const COLORS = [LudoColor.GREEN, LudoColor.YELLOW, LudoColor.BLUE, LudoColor.RED];

const LudoGame: React.FC<GameProps> = ({ playerName, onGameEnd, network }) => {
    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';
    
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

    // Multi-player state synchronization
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
                });
            } else if (isHost) {
                network.onActionReceived((action, payload, senderId) => {
                    if (action === 'CLAIM_SEAT') {
                        setPlayers(prev => prev.map(p => 
                            p.color === payload.color 
                            ? { ...p, name: payload.name, isBot: false, id: senderId, avatar: '👤' } 
                            : p
                        ));
                    } else if (action === 'ROLL') handleRoll();
                    else if (action === 'MOVE') {
                        const piece = pieces.find(p => p.id === payload.pieceId);
                        if (piece) handleMove(piece);
                    }
                });
            }
        }
    }, [network, pieces, isHost, isGuest]);

    // Host broadcasts state to keep guests in sync
    useEffect(() => {
        if (isHost && network) {
            network.broadcastState({ 
                gamePhase, players, pieces, currentTurn, diceValue, isRolling, isMoving 
            });
        }
    }, [isHost, pieces, currentTurn, diceValue, isRolling, isMoving, gamePhase, players]);

    const handleRoll = () => {
        if (isRolling || isMoving || diceValue !== null) return;
        if (isGuest) { network?.sendAction('ROLL'); return; }
        
        setIsRolling(true);
        audioService.playRoll();
        
        // Simulate rolling delay for visual impact
        setTimeout(() => {
            const val = Math.floor(Math.random() * 6) + 1;
            setDiceValue(val);
            setIsRolling(false);
            
            // Auto-skip turn if no valid moves
            const myPieces = pieces.filter(p => p.color === players[currentTurn].color);
            if (!myPieces.some(p => canMove(p, val))) {
                setTimeout(() => {
                    setDiceValue(null);
                    setCurrentTurn((t) => (t + 1) % 4);
                }, 1000);
            }
        }, 800);
    };

    const handleMove = async (piece: Piece) => {
        if (isMoving || diceValue === null) return;
        if (isGuest) { network?.sendAction('MOVE', { pieceId: piece.id }); return; }
        
        setIsMoving(true);
        const startPos = piece.position;
        const targetPos = startPos === -1 ? 0 : startPos + diceValue;
        
        // Step-by-step movement animation
        for (let i = 1; i <= (targetPos - startPos); i++) {
            setPieces(prev => prev.map(p => p.id === piece.id ? { ...p, position: startPos + i } : p));
            audioService.playTick();
            await new Promise(r => setTimeout(r, 150));
        }

        // Capture check could be implemented here
        
        setDiceValue(null);
        setIsMoving(false);
        
        // Roll again if 6, else next turn
        if (diceValue !== 6) {
            setCurrentTurn((t) => (t + 1) % 4);
        }
    };

    // Bot Logic (only host processes bots)
    useEffect(() => {
        if (isHost && players[currentTurn].isBot && gamePhase === 'PLAYING' && !isRolling && !isMoving && diceValue === null) {
            const timer = setTimeout(handleRoll, 1000);
            return () => clearTimeout(timer);
        }
        
        if (isHost && players[currentTurn].isBot && gamePhase === 'PLAYING' && diceValue !== null && !isMoving) {
            const myPieces = pieces.filter(p => p.color === players[currentTurn].color);
            const moveables = myPieces.filter(p => canMove(p, diceValue));
            if (moveables.length > 0) {
                const timer = setTimeout(() => handleMove(moveables[0]), 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [isHost, currentTurn, gamePhase, isRolling, isMoving, diceValue]);

    if (gamePhase === 'SETUP') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in zoom-in duration-500">
                <div className="bg-gray-900 p-8 md:p-12 rounded-[3.5rem] border border-gray-800 shadow-2xl max-w-2xl w-full">
                    <h2 className="text-3xl font-black text-center mb-10 text-white font-pixel uppercase tracking-tight">Setup Players</h2>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                        {players.map((p) => (
                            <button 
                                key={p.color} 
                                onClick={() => network?.sendAction('CLAIM_SEAT', { color: p.color, name: playerName })}
                                className={`relative p-6 rounded-[2.5rem] border-2 flex flex-col items-center gap-3 transition-all hover:scale-105 active:scale-95 group border-gray-700 bg-gray-800/40 
                                    ${p.name === playerName ? 'ring-4 ring-indigo-500 border-indigo-500 bg-indigo-500/10' : ''}`}
                            >
                                <div className="text-4xl filter drop-shadow-md">{p.avatar}</div>
                                <div className="font-bold text-xs uppercase tracking-widest text-gray-300">{p.name}</div>
                                
                                {p.isBot && p.name !== playerName && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 rounded-[2.5rem] transition-opacity text-[10px] font-black uppercase text-indigo-400">
                                        <MousePointer2 size={16} className="mr-2"/> Claim Seat
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {isHost ? (
                        <button 
                            onClick={() => { 
                                const initialPieces: Piece[] = [];
                                COLORS.forEach(c => { 
                                    for(let i=0; i<4; i++) initialPieces.push({ id: `${c}-${i}`, color: c, position: -1 }); 
                                });
                                setPieces(initialPieces);
                                setGamePhase('PLAYING');
                            }} 
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 rounded-[2.5rem] flex items-center justify-center gap-3 shadow-lg shadow-indigo-500/20 transition-all uppercase tracking-widest"
                        >
                            <Play fill="currentColor" size={20}/> Start Match
                        </button>
                    ) : (
                        <div className="text-center text-gray-500 animate-pulse font-pixel text-xs bg-gray-800/50 p-6 rounded-3xl border border-dashed border-gray-700">
                            Waiting for host to start...
                        </div>
                    )}
                </div>
            </div>
        );
    }

    const currentPlayer = players[currentTurn];
    const isMyTurn = currentPlayer.name === playerName;

    return (
        <div className="flex flex-col items-center gap-10 animate-in fade-in duration-700 pb-10">
            {/* Player Roster */}
            <div className="flex justify-between w-full max-w-[500px] px-2">
                {players.map((p, i) => (
                    <div key={p.color} className={`flex flex-col items-center transition-all duration-300 ${currentTurn === i ? 'scale-125 opacity-100' : 'opacity-40 scale-90 grayscale'}`}>
                        <div className={`w-14 h-14 rounded-3xl flex items-center justify-center text-3xl border-2 shadow-xl ${i === currentTurn ? 'bg-indigo-600 border-indigo-400' : 'bg-gray-800 border-gray-700'}`}>
                            {p.avatar}
                        </div>
                        <div className="text-[9px] font-black uppercase mt-3 tracking-tighter text-white">{p.name}</div>
                        {currentTurn === i && <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></div>}
                    </div>
                ))}
            </div>

            <LudoBoard 
                pieces={pieces} 
                players={players} 
                validMoves={!isMoving && diceValue !== null && isMyTurn ? pieces.filter(p => p.color === currentPlayer.color && canMove(p, diceValue)).map(p => p.id) : []} 
                onPieceClick={handleMove} 
                movingPieceId={null} 
                diceValue={diceValue}
            />

            {/* Turn Control Center */}
            <div className="flex items-center gap-6 bg-gray-900/80 backdrop-blur-md p-8 rounded-[3.5rem] border border-gray-800 w-full max-w-[500px] shadow-2xl">
                <div className="flex-1">
                    <div className="text-xl font-black text-white uppercase tracking-tighter">{currentPlayer.name}'s Turn</div>
                    {!isMyTurn && (
                        <div className="text-[10px] text-indigo-400 uppercase tracking-widest flex items-center gap-2 mt-2 font-bold">
                            <Loader2 size={12} className="animate-spin"/> Waiting for move...
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={handleRoll} 
                    disabled={!isMyTurn || diceValue !== null || isRolling || isMoving} 
                    className={`w-24 h-24 rounded-3xl flex items-center justify-center transition-all shadow-xl
                        ${diceValue !== null ? 'bg-white text-black scale-105' : 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95'} 
                        disabled:opacity-40 disabled:scale-100`}
                >
                    {isRolling ? (
                        <RotateCcw className="animate-spin" size={40} />
                    ) : (
                        <div className="font-black text-4xl">
                            {diceValue || <Dice5 size={40}/>}
                        </div>
                    )}
                </button>
            </div>
        </div>
    );
};

export default LudoGame;
