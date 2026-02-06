
import React, { useState, useEffect, useCallback, useRef } from 'react';
import LudoBoard from './LudoBoard';
import { LudoColor, Player, Piece, GameProps } from '../../types';
import { canMove, getSmartAIMove, START_OFFSETS } from './ludoLogic';
import { Dice5, Play, Loader2, Sparkles, Trophy, UserPlus, RefreshCw, AlertCircle } from 'lucide-react';
import { audioService } from '../../services/audioService';

const COLORS = [LudoColor.GREEN, LudoColor.YELLOW, LudoColor.BLUE, LudoColor.RED];

const LudoGame: React.FC<GameProps> = ({ playerName, onGameEnd, network }) => {
    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';
    const myId = network?.myId || 'HOST';
    
    const [gamePhase, setGamePhase] = useState<'SETUP' | 'PLAYING' | 'VICTORY'>('SETUP');
    const [players, setPlayers] = useState<Player[]>([
        { id: myId, name: playerName, color: LudoColor.GREEN, isBot: false, avatar: '🤴' },
        { id: 'bot-2', name: 'Bot Yellow', color: LudoColor.YELLOW, isBot: true, avatar: '🐯' },
        { id: 'bot-3', name: 'Bot Blue', color: LudoColor.BLUE, isBot: true, avatar: '🤖' },
        { id: 'bot-4', name: 'Bot Red', color: LudoColor.RED, isBot: true, avatar: '🦊' },
    ]);
    const [pieces, setPieces] = useState<Piece[]>([]);
    const [currentTurn, setCurrentTurn] = useState(0);
    const [diceValue, setDiceValue] = useState<number | null>(null);
    const [isRolling, setIsRolling] = useState(false);
    const [isMoving, setIsMoving] = useState(false);
    const [movingPieceId, setMovingPieceId] = useState<string | null>(null);
    const [consecutiveSixes, setConsecutiveSixes] = useState(0);
    const [errorState, setErrorState] = useState<string | null>(null);

    const piecesRef = useRef(pieces);
    useEffect(() => { piecesRef.current = pieces; }, [pieces]);

    // Systemic Networking & Error Handling
    useEffect(() => {
        if (!network) return;
        
        if (isGuest) {
            network.onStateUpdate((state) => {
                try {
                    setGamePhase(state.gamePhase);
                    setPlayers(state.players);
                    setPieces(state.pieces);
                    setCurrentTurn(state.currentTurn);
                    setDiceValue(state.diceValue);
                    setIsRolling(state.isRolling);
                    setIsMoving(state.isMoving);
                    setMovingPieceId(state.movingPieceId);
                    setErrorState(null);
                } catch (e) {
                    setErrorState("Sync error. Attempting to recover...");
                }
            });
        } else if (isHost) {
            network.onActionReceived((action, payload, senderId) => {
                try {
                    if (action === 'CLAIM_SEAT') {
                        setPlayers(prev => prev.map(p => 
                            p.color === payload.color 
                            ? { ...p, name: payload.name, isBot: false, id: senderId, avatar: '👤' } 
                            : p
                        ));
                    } else if (action === 'ROLL') {
                        if (players[currentTurn].id === senderId) handleRoll();
                    } else if (action === 'MOVE') {
                        if (players[currentTurn].id === senderId) {
                            const p = piecesRef.current.find(pc => pc.id === payload.pieceId);
                            if (p) handleMove(p);
                        }
                    }
                } catch (e) { console.error("Network Action Failed", e); }
            });
        }
    }, [network, isHost, isGuest, currentTurn, players]);

    // Broadcast State (Host only)
    useEffect(() => {
        if (isHost && network && network.isConnected) {
            network.broadcastState({ gamePhase, players, pieces, currentTurn, diceValue, isRolling, isMoving, movingPieceId });
        }
    }, [isHost, pieces, currentTurn, diceValue, isRolling, isMoving, gamePhase, players, movingPieceId, network]);

    const handleRoll = () => {
        if (isRolling || isMoving || diceValue !== null) return;
        if (isGuest) { network?.sendAction('ROLL'); return; }
        
        setIsRolling(true);
        audioService.playRoll();
        
        setTimeout(() => {
            const val = Math.floor(Math.random() * 6) + 1;
            setDiceValue(val);
            setIsRolling(false);
            
            if (val === 6) setConsecutiveSixes(prev => prev + 1);
            else setConsecutiveSixes(0);

            const myPieces = piecesRef.current.filter(p => p.color === players[currentTurn].color);
            const possibleMoves = myPieces.filter(p => canMove(p, val));
            
            if (possibleMoves.length === 0) {
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
        setMovingPieceId(piece.id);
        const startPos = piece.position;
        const rollVal = diceValue;
        const targetPos = startPos === -1 ? 0 : startPos + rollVal;
        
        // Systemic Step-by-Step "Hop" Animation
        const steps = targetPos - startPos;
        for (let i = 1; i <= steps; i++) {
            const currentStep = startPos + i;
            setPieces(prev => prev.map(p => p.id === piece.id ? { ...p, position: currentStep } : p));
            audioService.playTick();
            await new Promise(r => setTimeout(r, 150));
        }

        const finalGlobalPos = (START_OFFSETS[piece.color] + targetPos) % 52;
        const isSafeSpot = [0, 8, 13, 21, 26, 34, 39, 47].includes(finalGlobalPos);
        
        let extraTurn = false;

        // Capture Logic (with safety spot check)
        if (targetPos <= 50 && !isSafeSpot) {
            const victims = piecesRef.current.filter(p => 
                p.color !== piece.color && 
                p.position !== -1 && 
                p.position <= 50 &&
                (START_OFFSETS[p.color] + p.position) % 52 === finalGlobalPos
            );
            
            if (victims.length > 0) {
                audioService.playCapture();
                setPieces(prev => prev.map(p => victims.some(v => v.id === p.id) ? { ...p, position: -1 } : p));
                extraTurn = true;
            }
        }

        // Win Verification
        const updatedPieces = piecesRef.current.map(p => p.id === piece.id ? { ...p, position: targetPos } : p);
        const myPieces = updatedPieces.filter(p => p.color === piece.color);
        if (myPieces.every(p => p.position === 57)) {
            setGamePhase('VICTORY');
            audioService.playCelebration();
            if (onGameEnd) onGameEnd(players[currentTurn].name);
        }

        setDiceValue(null);
        setIsMoving(false);
        setMovingPieceId(null);
        
        if (rollVal === 6 && consecutiveSixes < 3) extraTurn = true;

        if (!extraTurn) {
            setConsecutiveSixes(0);
            setCurrentTurn((t) => (t + 1) % 4);
        }
    };

    // Auto-Move Bot logic
    useEffect(() => {
        if (!isHost || gamePhase !== 'PLAYING' || isMoving || isRolling) return;
        const activePlayer = players[currentTurn];
        if (!activePlayer.isBot) return;

        const timer = setTimeout(() => {
            if (diceValue === null) {
                handleRoll();
            } else {
                const myPieces = piecesRef.current.filter(p => p.color === activePlayer.color);
                const bestMove = getSmartAIMove(myPieces, piecesRef.current, diceValue, activePlayer.color);
                if (bestMove) handleMove(bestMove.piece);
                else {
                    setDiceValue(null);
                    setCurrentTurn(t => (t + 1) % 4);
                }
            }
        }, 1200);
        return () => clearTimeout(timer);
    }, [currentTurn, diceValue, isMoving, isRolling, gamePhase, isHost, players]);

    const isMyTurn = players[currentTurn].id === myId || (isHost && players[currentTurn].isBot);

    if (gamePhase === 'SETUP') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 animate-in zoom-in">
                <div className="bg-gray-900 p-10 rounded-[3rem] border-2 border-indigo-500/20 shadow-2xl max-w-2xl w-full text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><UserPlus size={120}/></div>
                    <h2 className="text-4xl font-black mb-8 text-white uppercase italic tracking-tighter font-pixel">Ludo Royale</h2>
                    
                    <div className="grid grid-cols-2 gap-4 mb-10">
                        {players.map((p, i) => (
                            <button 
                                key={p.color} 
                                onClick={() => network?.sendAction('CLAIM_SEAT', { color: p.color, name: playerName })}
                                className={`p-8 rounded-[2.5rem] border-2 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95
                                    ${p.id === myId ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-800 bg-gray-800/40'}`}
                            >
                                <span className="text-5xl drop-shadow-lg">{p.avatar}</span>
                                <span className="font-bold text-[10px] uppercase text-gray-500 truncate max-w-full px-2">{p.name}</span>
                                {p.isBot && <span className="text-[8px] bg-indigo-500/20 px-2 py-0.5 rounded text-indigo-300">BOT</span>}
                            </button>
                        ))}
                    </div>

                    {isHost ? (
                        <button onClick={() => { 
                            const initial: Piece[] = [];
                            COLORS.forEach(c => { for(let i=0; i<4; i++) initial.push({ id: `${c}-${i}`, color: c, position: -1 }); });
                            setPieces(initial);
                            setGamePhase('PLAYING');
                            audioService.playLevelUp();
                        }} className="w-full bg-white text-black font-black py-5 rounded-2xl text-xl shadow-2xl hover:bg-gray-200 uppercase tracking-widest">START MATCH</button>
                    ) : (
                        <div className="text-gray-500 animate-pulse flex flex-col items-center gap-2">
                            <Loader2 className="animate-spin" />
                            <span className="uppercase text-[10px] font-black">Syncing with Host Lobby...</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center gap-8 animate-in fade-in py-10 relative">
            {errorState && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-2 rounded-full text-xs font-black z-50 flex items-center gap-2 shadow-2xl animate-bounce">
                    <AlertCircle size={14}/> {errorState}
                </div>
            )}

            <div className="flex justify-between w-full max-w-[500px] px-4">
                {players.map((p, i) => (
                    <div key={p.color} className={`flex flex-col items-center transition-all duration-500 ${currentTurn === i ? 'scale-125' : 'opacity-40 grayscale'}`}>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl border-2 ${i === currentTurn ? 'bg-indigo-600 border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-gray-800 border-gray-700'}`}>{p.avatar}</div>
                        <div className="text-[8px] font-black uppercase mt-2 text-white truncate max-w-[60px]">{p.name.split(' ')[0]}</div>
                    </div>
                ))}
            </div>

            <LudoBoard 
                pieces={pieces} 
                players={players} 
                validMoves={!isMoving && diceValue !== null && isMyTurn ? pieces.filter(p => p.color === players[currentTurn].color && canMove(p, diceValue)).map(p => p.id) : []} 
                onPieceClick={handleMove} 
                movingPieceId={movingPieceId} 
                diceValue={diceValue}
            />

            <div className="bg-gray-900/90 p-8 rounded-[3rem] border border-white/5 w-full max-w-[500px] flex items-center justify-between shadow-2xl backdrop-blur-xl">
                <div className="flex-1">
                    <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Session Protocol</div>
                    <div className="text-xl font-black text-white uppercase">{isMyTurn ? "YOUR MOVE" : `${players[currentTurn].name}'s Turn`}</div>
                </div>
                
                <div className="flex gap-4 items-center">
                    {isHost && (
                         <button onClick={() => setGamePhase('SETUP')} className="p-3 text-gray-500 hover:text-white transition-colors" title="Soft Reset"><RefreshCw size={20}/></button>
                    )}
                    <button 
                        onClick={handleRoll} 
                        disabled={!isMyTurn || diceValue !== null || isRolling || isMoving} 
                        className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl active:scale-95 transition-all
                            ${!isMyTurn || diceValue !== null || isRolling || isMoving ? 'bg-gray-800 opacity-30' : 'bg-indigo-600 hover:bg-indigo-500'}
                        `}
                    >
                        {isRolling ? <Loader2 className="animate-spin text-white" size={40}/> : <span className="text-5xl font-black text-white">{diceValue || <Dice5 size={40}/>}</span>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LudoGame;
