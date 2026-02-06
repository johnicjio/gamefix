
import React, { useState } from 'react';
import { GameType } from '../types';
// Added missing Sparkles import
import { Play, ShieldCheck, Dice5, Grid3X3, Scissors, Mountain, Loader2, Wifi, Copy, Check, Search, Zap, Trophy, Gamepad2, Sparkles } from 'lucide-react';

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

    const cards = [
        { type: GameType.LUDO, title: "LUDO ROYALE", icon: <Dice5 size={32}/>, color: "indigo" },
        { type: GameType.NEON_CRUSH, title: "CRUSH RUSH", icon: <Zap size={32}/>, color: "yellow" },
        { type: GameType.SNAKE, title: "PIXEL CLIMB", icon: <Mountain size={32}/>, color: "emerald" },
        { type: GameType.BRAWLER, title: "BRAWLERS", icon: <Trophy size={32}/>, color: "red" },
        { type: GameType.TIC_TAC_TOE, title: "NEON TAC", icon: <Grid3X3 size={32}/>, color: "cyan" },
        { type: GameType.ROCK_PAPER_SCISSORS, title: "R.P.S. DUEL", icon: <Scissors size={32}/>, color: "rose" },
        { type: GameType.CARROM, title: "CARROM PRO", icon: <Gamepad2 size={32}/>, color: "amber" },
        { type: GameType.CANDY_LAND, title: "CANDY LAND", icon: <Sparkles size={32}/>, color: "pink" }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 animate-in fade-in zoom-in">
            <div className="max-w-6xl w-full bg-gray-900/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-8 sm:p-12 shadow-2xl relative">
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-full border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-8">
                        <ShieldCheck size={14} /> P2P Sync Hub
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tighter uppercase italic font-pixel">
                        ARENA <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">ROYALE</span>
                    </h1>
                    
                    <div className="mb-10 w-full max-w-lg">
                        {networkRole === 'OFFLINE' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button onClick={onCreateRoom} className="bg-indigo-600 hover:bg-indigo-500 text-white p-5 rounded-2xl font-black shadow-lg transition-all flex flex-col items-center">
                                    <span className="text-lg uppercase">Host Lobby</span>
                                    <span className="text-[9px] opacity-70">Create shared session</span>
                                </button>
                                <div className="bg-gray-800 border-2 border-gray-700 rounded-2xl p-1 flex items-center group focus-within:border-indigo-500 transition-all">
                                    <input 
                                        value={joinId}
                                        onChange={e => setJoinId(e.target.value.toUpperCase())}
                                        placeholder="JOIN FRIEND..."
                                        className="bg-transparent w-full px-4 text-white font-bold outline-none text-center text-sm"
                                    />
                                    <button onClick={() => onJoinRoom(joinId)} disabled={!joinId} className="bg-white text-black p-4 rounded-xl hover:bg-gray-200 disabled:opacity-20 transition-all">
                                        <Search size={20}/>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-gray-800/50 border border-white/10 rounded-3xl p-6 flex flex-col items-center gap-4">
                                <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                                    {networkRole === 'HOST' ? 'Lobby ID' : 'Connected to'}
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 bg-black/40 px-6 py-3 rounded-xl border border-white/10">
                                        <span className="font-mono text-xl text-white tracking-widest">{playerName}</span>
                                        {networkRole === 'HOST' && (
                                            <button onClick={() => { navigator.clipboard.writeText(playerName); setCopied(true); setTimeout(() => setCopied(false), 2000); }} className="p-2 hover:bg-white/10 rounded-lg">
                                                {copied ? <Check size={16} className="text-green-400"/> : <Copy size={16} className="text-gray-400"/>}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {guestJoined ? (
                                    <div className="text-green-400 text-[10px] font-black flex items-center gap-2 uppercase tracking-widest animate-pulse">
                                        <Wifi size={14}/> Synchronized
                                    </div>
                                ) : (
                                    <div className="text-gray-500 text-[10px] font-black flex items-center gap-2 uppercase tracking-widest">
                                        <Loader2 size={14} className="animate-spin"/> Waiting for Challenger
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full mb-12">
                        {cards.map(card => {
                            const isSelected = selectedGame === card.type;
                            return (
                                <button 
                                    key={card.type}
                                    onClick={() => networkRole !== 'GUEST' && setSelectedGame(card.type)}
                                    disabled={networkRole === 'GUEST'}
                                    className={`relative p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 hover:scale-105 active:scale-95
                                        ${isSelected ? `bg-indigo-600 border-indigo-400 shadow-2xl scale-110 z-10` : 'bg-gray-800/40 border-gray-700 opacity-60'}
                                    `}
                                >
                                    <div className={`p-3 rounded-2xl ${isSelected ? 'bg-white/20' : 'bg-gray-700'} shadow-lg mb-1`}>
                                        {card.icon}
                                    </div>
                                    <div className="text-[10px] font-black text-white tracking-tight font-pixel text-center">{card.title}</div>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => onSelectGame(selectedGame)}
                        disabled={(networkRole === 'HOST' && !guestJoined) || (networkRole === 'GUEST')}
                        className="w-full max-w-sm px-8 py-6 bg-white text-black rounded-2xl font-black text-xl shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 font-pixel disabled:opacity-20 uppercase"
                    >
                        <Play fill="currentColor" size={24}/> Run Protocol
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
