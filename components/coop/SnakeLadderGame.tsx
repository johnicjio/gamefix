
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GameProps } from '../../types';
import { audioService } from '../../services/audioService';
import { User, Cpu, ArrowUpCircle, Ghost, AlertTriangle, Wifi, Loader2, Play } from 'lucide-react';

const SNAKES: Record<number, number> = { 17: 7, 54: 34, 62: 18, 64: 60, 87: 24, 93: 73, 95: 75, 99: 80 };
const LADDERS: Record<number, number> = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };

const SnakeLadderGame: React.FC<GameProps> = ({ playerName, onGameEnd, network }) => {
    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';
    const isConnected = network?.isConnected ?? false;
    
    const [players, setPlayers] = useState([
        { id: 'p1', name: playerName, pos: 1, isBot: false, color: '#10b981', avatar: '👾' },
        { id: 'p2', name: isConnected ? 'Opponent' : 'CPU', pos: 1, isBot: !isConnected, color: '#3b82f6', avatar: '🤖' }
    ]);
    const [turn, setTurn] = useState(0);
    const [dice, setDice] = useState<number | null>(null);
    const [isMoving, setIsMoving] = useState(false);
    const [log, setLog] = useState<string[]>(["Arena Initialized."]);

    // Connection recovery / AI switch
    useEffect(() => {
        if (!isConnected && network?.role !== 'OFFLINE') {
            setPlayers(prev => prev.map((p, idx) => idx === 1 ? { ...p, isBot: true, name: 'CPU' } : p));
            setLog(prev => ["Network lost. CPU taking over...", ...prev].slice(0, 5));
        } else if (isConnected) {
            setPlayers(prev => prev.map((p, idx) => idx === 1 ? { ...p, isBot: false, name: 'Opponent' } : p));
        }
    }, [isConnected, network?.role]);

    // Networking
    useEffect(() => {
        if (network) {
            if (isHost) {
                network.onActionReceived((action, payload, senderId) => {
                    if (action === 'ROLL_REQUEST' && turn === 1 && !isMoving && isConnected) {
                        handleRoll();
                    }
                });
            } else if (isGuest) {
                network.onStateUpdate((state) => {
                    if (state.type === 'MOVE_EXECUTE') {
                        executeMove(state.roll, state.target, state.final, state.msg);
                    }
                    setPlayers(state.players);
                    setTurn(state.turn);
                });
            }
        }
    }, [network, isHost, isGuest, turn, isMoving, isConnected]);

    // Host broadcast
    useEffect(() => {
        if (isHost && network && isConnected) {
            network.broadcastState({ players, turn });
        }
    }, [isHost, players, turn, network, isConnected]);

    const handleRoll = async () => {
        if (isMoving || dice !== null) return;
        
        // If we are guest and it's our turn, send request to host
        if (isGuest && turn === 1 && isConnected) { 
            network?.sendAction('ROLL_REQUEST'); 
            return; 
        }

        const roll = Math.floor(Math.random() * 6) + 1;
        const target = Math.min(100, players[turn].pos + roll);
        let final = target;
        let msg = null;

        if (SNAKES[target]) { final = SNAKES[target]; msg = "Glitch! Down a snake."; }
        else if (LADDERS[target]) { final = LADDERS[target]; msg = "Power up! Up a ladder."; }

        if (isHost && isConnected) {
            network.broadcastState({ type: 'MOVE_EXECUTE', roll, target, final, msg });
        }
        await executeMove(roll, target, final, msg);
    };

    const executeMove = async (roll: number, target: number, final: number, msg: string | null) => {
        setIsMoving(true);
        audioService.playRoll();
        
        // Dice visual
        for (let i = 0; i < 8; i++) {
            setDice(Math.floor(Math.random() * 6) + 1);
            await new Promise(r => setTimeout(r, 60));
        }
        setDice(roll);
        await new Promise(r => setTimeout(r, 400));

        // Step animation
        let current = players[turn].pos;
        for (let i = current + 1; i <= target; i++) {
            setPlayers(prev => prev.map((p, idx) => idx === turn ? { ...p, pos: i } : p));
            audioService.playTick();
            await new Promise(r => setTimeout(r, 150));
        }

        if (msg) {
            setLog(prev => [msg, ...prev].slice(0, 5));
            audioService.playChime();
            await new Promise(r => setTimeout(r, 600));
            setPlayers(prev => prev.map((p, idx) => idx === turn ? { ...p, pos: final } : p));
        }

        if (final === 100) {
            audioService.playCelebration();
            if (onGameEnd && (isHost || !isConnected)) onGameEnd(players[turn].name);
            return;
        }

        setDice(null);
        setIsMoving(false);
        if (isHost || !isConnected) setTurn(t => (t + 1) % 2);
    };

    // Bot logic
    useEffect(() => {
        const activePlayer = players[turn];
        if ((isHost || !isConnected) && activePlayer.isBot && !isMoving && !dice) {
            const t = setTimeout(handleRoll, 1000);
            return () => clearTimeout(t);
        }
    }, [isHost, turn, isMoving, dice, players, isConnected]);

    const getCoords = (pos: number) => {
        const index = pos - 1;
        const row = Math.floor(index / 10);
        const col = index % 10;
        const x = row % 2 === 0 ? col : 9 - col;
        const y = 9 - row; 
        return { x, y };
    };

    const isMyTurn = isHost ? (turn === 0) : (isConnected ? (turn === 1) : false);

    return (
        <div className="flex flex-col items-center w-full max-w-6xl mx-auto p-4 gap-6 select-none font-pixel animate-in fade-in">
            <div className="text-center">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500 uppercase tracking-widest italic mb-2">
                    Climb or Fall
                </h1>
                {!isConnected && network?.role !== 'OFFLINE' && <span className="text-[10px] text-amber-500 animate-pulse font-black">AI TAKEOVER ACTIVE</span>}
            </div>
            
            <div className="flex flex-col lg:flex-row gap-8 items-start justify-center w-full">
                <div className="relative w-full max-w-[600px] aspect-square bg-[#0a0a0a] border-8 border-gray-900 rounded-3xl p-2 shadow-2xl">
                    <div className="w-full h-full grid grid-cols-10 grid-rows-10 border-2 border-white/5">
                        {Array.from({length: 100}).map((_, i) => {
                             const row = Math.floor(i / 10);
                             const col = i % 10;
                             const actualRow = 9 - row;
                             const actualCol = actualRow % 2 === 0 ? col : 9 - col;
                             const num = actualRow * 10 + actualCol + 1;
                             return (
                                <div key={num} className={`relative flex items-center justify-center border-[0.5px] border-white/5 text-[8px]
                                    ${(Math.floor((num-1)/10) + ((num-1)%10)) % 2 === 0 ? 'bg-gray-900/40' : 'bg-black/20'}
                                    ${SNAKES[num] ? 'text-rose-500 font-black' : LADDERS[num] ? 'text-emerald-400 font-black' : 'text-gray-700'}
                                `}>
                                    {num}
                                    {SNAKES[num] && <div className="absolute inset-0 flex items-center justify-center opacity-20"><Ghost size={16} /></div>}
                                    {LADDERS[num] && <div className="absolute inset-0 flex items-center justify-center opacity-20"><ArrowUpCircle size={16} /></div>}
                                </div>
                             );
                        })}
                    </div>
                    
                    <svg className="absolute inset-0 pointer-events-none w-full h-full opacity-40" viewBox="0 0 100 100">
                        {Object.entries(LADDERS).map(([start, end]) => {
                            const s = getCoords(parseInt(start));
                            const e = getCoords(end);
                            return <line key={`l-${start}`} x1={s.x*10+5} y1={s.y*10+5} x2={e.x*10+5} y2={e.y*10+5} stroke="#10b981" strokeWidth="2" strokeDasharray="1,1" />;
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
                             <div key={p.id} className="absolute w-[10%] h-[10%] flex items-center justify-center transition-all duration-300 z-20" style={{ left: `${x * 10}%`, top: `${y * 10}%` }}>
                                 <div className={`w-10 h-10 flex items-center justify-center text-2xl bg-gray-800 rounded-xl border-4 shadow-xl transition-transform ${turn === i ? 'scale-110 animate-bounce' : 'scale-90 opacity-80'}`} style={{ borderColor: p.color }}>{p.avatar}</div>
                             </div>
                         );
                    })}
                </div>

                <div className="w-full lg:w-72 flex flex-col gap-6">
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl flex flex-col items-center gap-6 shadow-xl">
                        <div className="text-center">
                            <div className="text-[10px] text-gray-500 uppercase mb-2">Active Turn</div>
                            <div className={`text-sm font-black px-4 py-2 rounded-xl bg-black border border-white/5 transition-colors ${turn === 0 ? 'text-emerald-400 border-emerald-500/30' : 'text-blue-400 border-blue-500/30'}`}>
                                {players[turn].name}
                            </div>
                        </div>
                        <button 
                            onClick={handleRoll} 
                            disabled={!isMyTurn || isMoving} 
                            className={`w-28 h-28 rounded-3xl flex items-center justify-center text-5xl transition-all shadow-2xl relative overflow-hidden group
                                ${dice ? 'bg-white text-black scale-105' : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95'} 
                                disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {isMoving && !dice ? <Loader2 className="animate-spin" size={40}/> : dice ?? '?'}
                            {isMyTurn && !isMoving && !dice && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                        </button>
                    </div>

                    <div className="bg-black/40 border border-white/5 rounded-2xl p-4 h-40 overflow-y-auto font-mono text-[9px] text-gray-500 flex flex-col-reverse gap-2">
                        {log.map((l, i) => <div key={i} className={i === 0 ? 'text-emerald-400' : ''}>{`>> ${l}`}</div>)}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SnakeLadderGame;
