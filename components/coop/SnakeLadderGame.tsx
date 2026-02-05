
import React, { useState, useEffect, useMemo } from 'react';
import { GameProps } from '../../types';
import { audioService } from '../../services/audioService';
import { User, Cpu, ArrowUpCircle, Ghost, AlertTriangle, RefreshCw, Wifi } from 'lucide-react';

const SNAKES: Record<number, number> = { 17:7, 54:34, 62:18, 64:60, 87:24, 93:73, 95:75, 99:80 };
const LADDERS: Record<number, number> = { 1:38, 4:14, 9:31, 21:42, 28:84, 36:44, 51:67, 71:91, 80:100 };

const SnakeLadderGame: React.FC<GameProps> = ({ playerName, onGameEnd, network }) => {
    // Network Role Determination
    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';
    const isConnected = network?.isConnected ?? false;
    const isOfflineMode = !network || network.role === 'OFFLINE' || (network.role === 'HOST' && !isConnected);

    const [players, setPlayers] = useState([
        { id: 'p1', name: playerName, pos: 1, isBot: false, color: '#10b981', avatar: '👾' },
        { id: 'p2', name: isOfflineMode ? 'Bot Blue' : 'Opponent', pos: 1, isBot: isOfflineMode, color: '#3b82f6', avatar: isOfflineMode ? '🤖' : '👩‍🚀' }
    ]);
    const [turn, setTurn] = useState(0);
    const [dice, setDice] = useState<number | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [log, setLog] = useState<string[]>(["Welcome to Pixel Climber!"]);

    const currentPlayer = players[turn];
    const isMyTurn = isHost ? (turn === 0) : (turn === 1); // Host is P1, Guest is P2

    // --- Networking Sync ---

    // 1. Sync Logic (Host Broadcasts, Guest Listens)
    useEffect(() => {
        if (network) {
            if (isGuest) {
                network.onStateUpdate((state) => {
                    setPlayers(state.players);
                    setTurn(state.turn);
                    setDice(state.dice);
                    setIsMoving(state.isMoving);
                    if (state.lastLog) setLog(prev => [state.lastLog, ...prev].slice(0, 5));
                });
            } else if (isHost) {
                network.onActionReceived((action, payload) => {
                    if (action === 'ROLL') {
                        handleRoll();
                    }
                });
            }
        }
    }, [network, isHost, isGuest]);

    // 2. Broadcast (Host Only)
    useEffect(() => {
        if (isHost && network && !isOfflineMode) {
            network.broadcastState({
                players,
                turn,
                dice,
                isMoving,
                // We send log only when it changes effectively, handled by setState elsewhere but 
                // for simple sync, we don't broadcast entire log array, just generic state.
            });
        }
    }, [players, turn, dice, isMoving, isHost, isOfflineMode, network]);

    // 3. Update P2 status if connection changes
    useEffect(() => {
        if (isHost) {
            setPlayers(prev => {
                const p2 = prev[1];
                const shouldBeBot = isOfflineMode;
                if (p2.isBot !== shouldBeBot) {
                    return [
                        prev[0],
                        { ...p2, isBot: shouldBeBot, name: shouldBeBot ? 'Bot Blue' : 'Opponent', avatar: shouldBeBot ? '🤖' : '👩‍🚀' }
                    ];
                }
                return prev;
            });
        }
    }, [isOfflineMode, isHost]);


    // --- Game Logic ---

    const handleRoll = () => {
        // Guest sends request
        if (isGuest && isConnected) {
            if (!isMyTurn) return;
            network?.sendAction('ROLL');
            return;
        }

        // Host/Offline Logic
        if (isMoving || dice) return;
        
        audioService.playRoll();
        setIsMoving(true);
        
        let counter = 0;
        const rollInterval = setInterval(() => {
            setDice(Math.floor(Math.random() * 6) + 1);
            counter++;
            if (counter > 10) {
                clearInterval(rollInterval);
                const finalVal = Math.floor(Math.random() * 6) + 1;
                setDice(finalVal);
                move(finalVal);
            }
        }, 50);
    };

    const move = async (steps: number) => {
        let curr = currentPlayer.pos;
        const target = Math.min(100, curr + steps);

        // Animate Step-by-Step
        for (let i = curr + 1; i <= target; i++) {
            setPlayers(prev => prev.map((p, idx) => idx === turn ? { ...p, pos: i } : p));
            audioService.playTick();
            await new Promise(r => setTimeout(r, 200));
        }

        if (target === 100) {
            audioService.playCelebration();
            setIsMoving(false);
            if (onGameEnd) setTimeout(() => onGameEnd(currentPlayer.name), 1500);
            return;
        }

        let finalPos = target;
        let eventMsg = "";
        
        if (SNAKES[target]) {
            finalPos = SNAKES[target];
            eventMsg = `GLITCH! ${currentPlayer.name} fell to ${finalPos}`;
            audioService.playFailure();
        } else if (LADDERS[target]) {
            finalPos = LADDERS[target];
            eventMsg = `POWER UP! ${currentPlayer.name} climbed to ${finalPos}`;
            audioService.playLevelUp();
        }

        if (finalPos !== target) {
            setLog(prev => [eventMsg, ...prev].slice(0, 5));
            if (isHost && !isOfflineMode) network?.broadcastState({ players, turn, dice, isMoving, lastLog: eventMsg });
            
            await new Promise(r => setTimeout(r, 500));
            setPlayers(prev => prev.map((p, idx) => idx === turn ? { ...p, pos: finalPos } : p));
        }

        setIsMoving(false);
        setDice(null);
        setTurn((turn + 1) % players.length);
    };

    // Bot Auto-play
    useEffect(() => {
        if (isHost && currentPlayer.isBot && !isMoving && !dice) {
            const t = setTimeout(handleRoll, 1500);
            return () => clearTimeout(t);
        }
    }, [turn, isMoving, dice, currentPlayer, isHost]);

    const getCoords = (pos: number) => {
        const index = pos - 1;
        const row = Math.floor(index / 10);
        const col = index % 10;
        const x = row % 2 === 0 ? col : 9 - col;
        const y = 9 - row; 
        return { x, y };
    };

    const boardCells = useMemo(() => {
        const cells = [];
        for (let i = 0; i < 100; i++) {
            const row = Math.floor(i / 10);
            const col = i % 10;
            const actualRow = 9 - row;
            const actualCol = actualRow % 2 === 0 ? col : 9 - col;
            const num = actualRow * 10 + actualCol + 1;
            cells.push({ num, row, col });
        }
        return cells;
    }, []);

    return (
        <div className="flex flex-col items-center w-full max-w-6xl mx-auto p-4 gap-6 select-none animate-in fade-in">
            <style>{`
                @keyframes float {
                    0% { transform: translateY(0px); }
                    50% { transform: translateY(-5px); }
                    100% { transform: translateY(0px); }
                }
                .pixel-border {
                    box-shadow: 0 -4px 0 0 #000, 0 4px 0 0 #000, -4px 0 0 0 #000, 4px 0 0 0 #000;
                }
            `}</style>

            <div className="text-center space-y-2">
                <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 font-pixel uppercase tracking-tighter italic">
                    Pixel Climber
                </h1>
                <div className="flex justify-center gap-4">
                     <p className="text-[10px] text-gray-500 uppercase tracking-widest font-pixel">STAGE 01</p>
                     {!isOfflineMode && (
                        <div className="flex items-center gap-1 text-[9px] bg-green-900/40 text-green-400 px-2 py-1 rounded">
                            <Wifi size={10} className="animate-pulse"/> ONLINE
                        </div>
                     )}
                </div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full">
                
                <div className="relative w-full max-w-[600px] aspect-square bg-[#0a0a0a] pixel-border p-2">
                    <div className="w-full h-full grid grid-cols-10 grid-rows-10 border-2 border-white/10">
                        {boardCells.map(({ num }) => {
                            const isSnake = SNAKES[num];
                            const isLadder = LADDERS[num];
                            return (
                                <div key={num} className={`relative flex items-center justify-center border-[1px] border-white/5 text-[8px] font-pixel
                                    ${(Math.floor((num-1)/10) + ((num-1)%10)) % 2 === 0 ? 'bg-gray-900/40' : 'bg-black/20'}
                                    ${isSnake ? 'text-rose-500' : isLadder ? 'text-emerald-400' : 'text-gray-700'}
                                `}>
                                    {num}
                                    {isSnake && <div className="absolute inset-0 flex items-center justify-center opacity-40"><Ghost size={16} /></div>}
                                    {isLadder && <div className="absolute inset-0 flex items-center justify-center opacity-40"><ArrowUpCircle size={16} /></div>}
                                </div>
                            );
                        })}
                    </div>
                    
                    <svg className="absolute inset-0 pointer-events-none w-full h-full opacity-30" viewBox="0 0 100 100">
                        {Object.entries(LADDERS).map(([start, end]) => {
                            const s = getCoords(parseInt(start));
                            const e = getCoords(end);
                            return <line key={`l-${start}`} x1={s.x*10+5} y1={s.y*10+5} x2={e.x*10+5} y2={e.y*10+5} stroke="#10b981" strokeWidth="2" strokeDasharray="2,2" />;
                        })}
                        {Object.entries(SNAKES).map(([start, end]) => {
                            const s = getCoords(parseInt(start));
                            const e = getCoords(end);
                            return <line key={`s-${start}`} x1={s.x*10+5} y1={s.y*10+5} x2={e.x*10+5} y2={e.y*10+5} stroke="#f43f5e" strokeWidth="2" strokeDasharray="1,1" />;
                        })}
                    </svg>
                    
                    {players.map((p, i) => {
                         const { x, y } = getCoords(p.pos);
                         return (
                             <div key={p.id} className="absolute w-[10%] h-[10%] flex items-center justify-center transition-all duration-300 z-20" style={{ left: `${x * 10}%`, top: `${y * 10}%`, animation: isMoving && turn === i ? 'float 0.3s infinite ease-in-out' : 'none' }}>
                                 <div className="w-8 h-8 flex items-center justify-center text-xl bg-gray-800 rounded-lg pixel-border border-2 shadow-lg" style={{ borderColor: p.color }}>{p.avatar}</div>
                             </div>
                         );
                    })}
                </div>

                <div className="w-full lg:w-72 flex flex-col gap-4">
                    <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                        {players.map((p, i) => (
                            <div key={p.id} className={`p-3 rounded-xl border-2 transition-all flex items-center gap-3 ${turn === i ? 'border-white bg-gray-800 scale-105' : 'border-gray-800 bg-black opacity-50'}`}>
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-900 text-xl border-2" style={{ borderColor: p.color }}>{p.avatar}</div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        <div className="text-[8px] font-pixel text-gray-500 truncate uppercase">{p.name}</div>
                                        {p.isBot ? <Cpu size={10} className="text-gray-600"/> : <User size={10} className="text-gray-600"/>}
                                    </div>
                                    <div className="text-xs font-pixel text-white">TILE {p.pos}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-gray-900 pixel-border p-6 flex flex-col items-center gap-4">
                        <div className="text-center">
                            <div className="text-[8px] font-pixel text-gray-500 uppercase mb-2">Current Turn</div>
                            <div className={`text-xs font-pixel px-4 py-2 rounded bg-black border border-white/10 ${currentPlayer.color === '#10b981' ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {currentPlayer.name}
                            </div>
                        </div>
                        <button 
                            onClick={handleRoll} 
                            disabled={!isMyTurn || isMoving} 
                            className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl pixel-border transition-all 
                                ${dice ? 'bg-white text-black scale-100 ring-4 ring-white/20' : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-105 active:scale-95'} 
                                disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            <span className="font-pixel">{dice ?? '?'}</span>
                        </button>
                    </div>

                    <div className="bg-black/80 rounded-lg p-3 h-32 overflow-hidden flex flex-col gap-1 border border-white/5">
                        <div className="text-[8px] font-pixel text-gray-700 mb-1 border-b border-white/5 pb-1 flex items-center gap-1"><AlertTriangle size={10} /> CONSOLE_LOG</div>
                        <div className="flex flex-col-reverse gap-1">
                            {log.map((l, i) => <div key={i} className={`text-[8px] font-pixel leading-relaxed ${i === 0 ? 'text-emerald-400' : 'text-gray-500'}`}>{`>> ${l}`}</div>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SnakeLadderGame;
