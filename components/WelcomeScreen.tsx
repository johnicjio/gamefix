
import React, { useState } from 'react';
import { GameType } from '../types';
import { Play, ShieldCheck, Dice5, Type, Loader2, LayoutGrid, Hash, Candy, Sword } from 'lucide-react';

interface WelcomeScreenProps {
    onSelectGame: (type: GameType) => void;
    isHost: boolean;
    connectedCount: number;
    playerName: string;
    roomCode: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectGame, isHost, connectedCount, playerName, roomCode }) => {
    const [selectedGame, setSelectedGame] = useState<GameType>(GameType.LUDO);

    const cards = [
        {
            type: GameType.LUDO,
            title: "LUDO ROYALE",
            tag: "Battle Strategy",
            desc: "The definitive 4-player experience with aggressive AI and physics-based pieces.",
            icon: <Dice5 className="text-white" size={40}/>,
            color: "indigo"
        },
        {
            type: GameType.CANDY_LAND,
            title: "CANDY LAND",
            tag: "Sweet Race",
            desc: "Enhanced 4-player race with traps, shortcuts, and wild card mechanics.",
            icon: <Candy className="text-white" size={40}/>,
            color: "pink"
        },
        {
            type: GameType.BRAWLER,
            title: "PIXEL BRAWL",
            tag: "Classic Action",
            desc: "Stomp your way to victory in this 4-player arcade platformer.",
            icon: <Sword className="text-white" size={40}/>,
            color: "red"
        },
        {
            type: GameType.SNAKE,
            title: "PIXEL CLIMBER",
            tag: "Retro Climb",
            desc: "Climb ladders and dodge snakes in a high-stakes 8-bit adventure.",
            icon: <LayoutGrid className="text-white" size={40}/>,
            color: "emerald"
        },
        {
            type: GameType.TIC_TAC_TOE,
            title: "NEON TIC-TAC",
            tag: "Quick Match",
            desc: "High-octane tic-tac-toe with neon visuals and neural bot processing.",
            icon: <Hash className="text-white" size={40}/>,
            color: "orange"
        },
        {
            type: GameType.WORD,
            title: "WORD RUSH",
            tag: "Linguistic Duel",
            desc: "Test your vocabulary against the clock in a fast-paced word chain.",
            icon: <Type className="text-white" size={40}/>,
            color: "purple"
        }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] animate-in fade-in zoom-in duration-500">
            <div className="max-w-6xl w-full bg-gray-900/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-8 sm:p-12 shadow-[0_0_100px_rgba(79,70,229,0.15)] relative overflow-hidden">
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-full border border-indigo-500/30 text-indigo-300 text-xs font-black uppercase tracking-widest mb-8">
                        <ShieldCheck size={14} /> Arena Hub v4.0
                    </div>

                    <h1 className="text-5xl sm:text-7xl font-black text-white mb-6 tracking-tighter uppercase italic drop-shadow-xl font-pixel">
                        ULTIMATE <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">ARENA</span>
                    </h1>
                    
                    <p className="text-gray-400 text-lg font-medium max-w-xl mb-12">
                        Welcome, <span className="text-white font-bold">{playerName}</span>. 
                        Prepare for digital dominance.
                    </p>

                    {/* Main Game Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full mb-12">
                        {cards.map(card => {
                            const isSelected = selectedGame === card.type;
                            const colorClass = card.color;
                            
                            const bgMap: Record<string, string> = {
                                indigo: 'bg-indigo-900/60 border-indigo-500 shadow-indigo-500/20',
                                emerald: 'bg-emerald-900/60 border-emerald-500 shadow-emerald-500/20',
                                orange: 'bg-orange-900/60 border-orange-500 shadow-orange-500/20',
                                pink: 'bg-pink-900/60 border-pink-500 shadow-pink-500/20',
                                purple: 'bg-purple-900/60 border-purple-500 shadow-purple-500/20',
                                red: 'bg-red-900/60 border-red-500 shadow-red-500/20'
                            };

                            const gradMap: Record<string, string> = {
                                indigo: 'from-indigo-500 to-indigo-700',
                                emerald: 'from-emerald-500 to-emerald-700',
                                orange: 'from-orange-500 to-orange-700',
                                pink: 'from-pink-500 to-pink-700',
                                purple: 'from-purple-500 to-purple-700',
                                red: 'from-red-500 to-red-700'
                            };

                            const textMap: Record<string, string> = {
                                indigo: 'text-indigo-300 bg-indigo-500/10',
                                emerald: 'text-emerald-300 bg-emerald-500/10',
                                orange: 'text-orange-300 bg-orange-500/10',
                                pink: 'text-pink-300 bg-pink-500/10',
                                purple: 'text-purple-300 bg-purple-500/10',
                                red: 'text-red-300 bg-red-500/10'
                            };
                            
                            return (
                                <button 
                                    key={card.type}
                                    onClick={() => setSelectedGame(card.type)}
                                    className={`relative group p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 hover:scale-105 active:scale-95
                                        ${isSelected 
                                            ? `${bgMap[colorClass]} shadow-2xl` 
                                            : 'bg-gray-800/40 border-gray-700 hover:bg-gray-800/60 opacity-60 hover:opacity-100'}
                                    `}
                                >
                                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradMap[colorClass]} shadow-lg mb-2 pixel-shadow`}>
                                        {card.icon}
                                    </div>
                                    <div className={`text-lg font-black text-white tracking-tight font-pixel ${isSelected ? 'animate-pulse' : ''}`}>{card.title}</div>
                                    <div className={`text-[9px] ${textMap[colorClass]} font-bold uppercase tracking-wider px-3 py-1 rounded-full`}>{card.tag}</div>
                                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 h-8 leading-tight">{card.desc}</p>
                                    {isSelected && <div className={`absolute inset-0 border-2 border-white/20 rounded-3xl animate-pulse`}></div>}
                                </button>
                            );
                        })}
                    </div>

                    {isHost ? (
                        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                             <button
                                onClick={() => onSelectGame(selectedGame)}
                                className="w-full group relative px-8 py-6 bg-white text-black rounded-2xl font-black text-xl shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all hover:scale-105 active:scale-95 overflow-hidden font-pixel"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative flex items-center justify-center gap-3"><Play fill="currentColor" size={24}/> START MATCH</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 animate-pulse">
                            <Loader2 size={48} className="text-indigo-500 animate-spin"/>
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Awaiting Host Command...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
