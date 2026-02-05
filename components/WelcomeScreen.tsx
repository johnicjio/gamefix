
import React, { useState } from 'react';
import { GameType } from '../types';
import { Play, ShieldCheck, Dice5, Grid3X3, Scissors, Mountain, Loader2, Wifi, Copy, Check, QrCode, ArrowRight } from 'lucide-react';

interface WelcomeScreenProps {
    onSelectGame: (type: GameType) => void;
    isHost: boolean;
    connectedCount: number;
    playerName: string;
    roomCode: string;
    networkRole: 'HOST' | 'GUEST' | 'OFFLINE';
    guestJoined: boolean;
    onCreateRoom: () => void;
    onJoinRoom: (id: string) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
    onSelectGame, isHost, playerName, roomCode, networkRole, guestJoined, onCreateRoom, onJoinRoom 
}) => {
    const [selectedGame, setSelectedGame] = useState<GameType>(GameType.LUDO);
    const [joinId, setJoinId] = useState('');
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const copyCode = () => {
        navigator.clipboard.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const cards = [
        {
            type: GameType.LUDO,
            title: "LUDO ROYALE",
            tag: "4-Player",
            desc: "The classic board game reimagined with premium animations.",
            icon: <Dice5 className="text-white" size={32}/>,
            color: "indigo"
        },
        {
            type: GameType.SNAKE,
            title: "PIXEL CLIMB",
            tag: "2-Player Co-op",
            desc: "Retro snakes & ladders. Climb to the top, avoid glitches.",
            icon: <Mountain className="text-white" size={32}/>,
            color: "emerald"
        },
        {
            type: GameType.TIC_TAC_TOE,
            title: "NEON TAC",
            tag: "1v1 Duel",
            desc: "Cyberpunk strategy. Classic game, neon vibes.",
            icon: <Grid3X3 className="text-white" size={32}/>,
            color: "cyan"
        },
        {
            type: GameType.ROCK_PAPER_SCISSORS,
            title: "R.P.S. DUEL",
            tag: "Quick Battle",
            desc: "Rock, Paper, Scissors. Fast-paced mind games.",
            icon: <Scissors className="text-white" size={32}/>,
            color: "rose"
        }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 animate-in fade-in zoom-in duration-500">
            <div className="max-w-5xl w-full bg-gray-900/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-8 sm:p-12 shadow-[0_0_100px_rgba(79,70,229,0.1)] relative overflow-hidden">
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-full border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-8">
                        <ShieldCheck size={14} /> Arena Hub v2.0
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tighter uppercase italic font-pixel">
                        DUO <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">ARENA</span>
                    </h1>
                    
                    {/* Connection Panel */}
                    <div className="mb-10 w-full max-w-lg">
                        {networkRole === 'OFFLINE' ? (
                            <div className="flex gap-4">
                                <button onClick={onCreateRoom} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black shadow-lg transition-all active:scale-95 flex flex-col items-center">
                                    <span className="text-lg">CREATE ROOM</span>
                                    <span className="text-[10px] opacity-70">BECOME HOST</span>
                                </button>
                                <div className="flex-1 bg-gray-800 border-2 border-gray-700 rounded-2xl p-1 flex items-center">
                                    <input 
                                        value={joinId}
                                        onChange={e => setJoinId(e.target.value)}
                                        placeholder="Enter Room ID"
                                        className="bg-transparent w-full px-4 text-white font-bold outline-none text-center"
                                    />
                                    <button onClick={() => onJoinRoom(joinId)} disabled={!joinId} className="bg-white text-black p-3 rounded-xl hover:bg-gray-200 disabled:opacity-50">
                                        <ArrowRight size={20}/>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-800/50 border border-indigo-500/30 rounded-3xl p-6 relative overflow-hidden">
                                {networkRole === 'HOST' ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Room Created</div>
                                        <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-xl border border-white/10">
                                            <span className="font-mono text-xl text-white tracking-widest">{roomCode}</span>
                                            <button onClick={copyCode} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                                {copied ? <Check size={16} className="text-green-400"/> : <Copy size={16} className="text-gray-400"/>}
                                            </button>
                                            <button onClick={() => setShowQR(!showQR)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                                <QrCode size={16} className="text-gray-400"/>
                                            </button>
                                        </div>
                                        
                                        {showQR && (
                                            <div className="bg-white p-2 rounded-xl animate-in zoom-in">
                                                <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${roomCode}`} alt="Room QR" className="w-32 h-32" />
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                            {guestJoined ? (
                                                <span className="text-green-400 flex items-center gap-2"><Wifi size={14}/> OPPONENT CONNECTED</span>
                                            ) : (
                                                <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin"/> WAITING FOR PLAYER...</span>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-4">
                                        <div className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Guest Mode</div>
                                        <div className="text-white font-bold">Connected to Room</div>
                                        <div className="text-xs text-gray-500 animate-pulse">Waiting for Host to start game...</div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full mb-12">
                        {cards.map(card => {
                            const isSelected = selectedGame === card.type;
                            const colorClass = card.color;
                            const bgMap: Record<string, string> = { indigo: 'bg-indigo-900/60 border-indigo-500', emerald: 'bg-emerald-900/60 border-emerald-500', cyan: 'bg-cyan-900/60 border-cyan-500', rose: 'bg-rose-900/60 border-rose-500' };
                            const gradMap: Record<string, string> = { indigo: 'from-indigo-500 to-indigo-700', emerald: 'from-emerald-500 to-emerald-700', cyan: 'from-cyan-500 to-cyan-700', rose: 'from-rose-500 to-rose-700' };

                            return (
                                <button 
                                    key={card.type}
                                    onClick={() => networkRole !== 'GUEST' && setSelectedGame(card.type)}
                                    disabled={networkRole === 'GUEST'}
                                    className={`relative group p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 hover:scale-105 active:scale-95 h-full
                                        ${isSelected ? `${bgMap[colorClass]} shadow-2xl scale-105` : 'bg-gray-800/40 border-gray-700 opacity-60 hover:opacity-100'}
                                        ${networkRole === 'GUEST' ? 'cursor-not-allowed opacity-40' : ''}
                                    `}
                                >
                                    <div className={`p-3 rounded-2xl bg-gradient-to-br ${gradMap[colorClass]} shadow-lg mb-2 pixel-shadow`}>
                                        {card.icon}
                                    </div>
                                    <div className="text-sm font-black text-white tracking-tight font-pixel">{card.title}</div>
                                    {isSelected && <div className={`absolute inset-0 border-2 border-white/20 rounded-3xl animate-pulse`}></div>}
                                </button>
                            );
                        })}
                    </div>

                    {isHost || networkRole === 'OFFLINE' ? (
                        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                             <button
                                onClick={() => onSelectGame(selectedGame)}
                                disabled={networkRole === 'HOST' && !guestJoined}
                                className="w-full group relative px-8 py-6 bg-white text-black rounded-2xl font-black text-xl shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95 overflow-hidden font-pixel disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative flex items-center justify-center gap-3"><Play fill="currentColor" size={24}/> START MATCH</span>
                            </button>
                        </div>
                    ) : (
                         <div className="text-gray-500 font-pixel text-xs animate-pulse">HOST CONTROLS THE LOBBY</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
