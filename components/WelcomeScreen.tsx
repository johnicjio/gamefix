
import React, { useState } from 'react';
import { GameType } from '../types';
import { Play, ShieldCheck, Dice5, Type, Loader2 } from 'lucide-react';

interface WelcomeScreenProps {
    onSelectGame: (type: GameType) => void;
    isHost: boolean;
    connectedCount: number;
    playerName: string;
    roomCode: string;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectGame, isHost, playerName }) => {
    const [selectedGame, setSelectedGame] = useState<GameType>(GameType.LUDO);

    const cards = [
        {
            type: GameType.LUDO,
            title: "LUDO ROYALE",
            tag: "4-Player Battle",
            desc: "The classic board game reimagined with premium animations and smart AI.",
            icon: <Dice5 className="text-white" size={40}/>,
            color: "indigo"
        },
        {
            type: GameType.WORD_QUEST,
            title: "WORD QUEST",
            tag: "Gemini AI Quiz",
            desc: "Test your vocabulary in an infinite duel against Google Gemini AI.",
            icon: <Type className="text-white" size={40}/>,
            color: "purple"
        }
    ];

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-4 animate-in fade-in zoom-in duration-500">
            <div className="max-w-4xl w-full bg-gray-900/60 backdrop-blur-2xl rounded-[3rem] border border-white/5 p-8 sm:p-12 shadow-[0_0_100px_rgba(79,70,229,0.1)] relative overflow-hidden">
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="inline-flex items-center gap-2 bg-indigo-500/20 px-4 py-2 rounded-full border border-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-8">
                        <ShieldCheck size={14} /> Arena Hub v1.0
                    </div>

                    <h1 className="text-4xl sm:text-6xl font-black text-white mb-6 tracking-tighter uppercase italic font-pixel">
                        DUO <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">ARENA</span>
                    </h1>
                    
                    <p className="text-gray-400 text-sm font-medium max-w-xl mb-12">
                        Welcome, <span className="text-white font-bold">{playerName}</span>. Select your battlefield.
                    </p>

                    {/* Simple 2-Game Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl mb-12">
                        {cards.map(card => {
                            const isSelected = selectedGame === card.type;
                            const colorClass = card.color;
                            
                            const bgMap: Record<string, string> = {
                                indigo: 'bg-indigo-900/60 border-indigo-500 shadow-indigo-500/20',
                                purple: 'bg-purple-900/60 border-purple-500 shadow-purple-500/20',
                            };

                            const gradMap: Record<string, string> = {
                                indigo: 'from-indigo-500 to-indigo-700',
                                purple: 'from-purple-500 to-purple-700',
                            };

                            const textMap: Record<string, string> = {
                                indigo: 'text-indigo-300 bg-indigo-500/10',
                                purple: 'text-purple-300 bg-purple-500/10',
                            };
                            
                            return (
                                <button 
                                    key={card.type}
                                    onClick={() => setSelectedGame(card.type)}
                                    className={`relative group p-8 rounded-3xl border-2 transition-all flex flex-col items-center gap-4 hover:scale-105 active:scale-95
                                        ${isSelected 
                                            ? `${bgMap[colorClass]} shadow-2xl` 
                                            : 'bg-gray-800/40 border-gray-700 hover:bg-gray-800/60 opacity-60 hover:opacity-100'}
                                    `}
                                >
                                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${gradMap[colorClass]} shadow-lg mb-2 pixel-shadow`}>
                                        {card.icon}
                                    </div>
                                    <div className={`text-xl font-black text-white tracking-tight font-pixel ${isSelected ? 'animate-pulse' : ''}`}>{card.title}</div>
                                    <div className={`text-[9px] ${textMap[colorClass]} font-bold uppercase tracking-[0.3em] px-3 py-1.5 rounded-full`}>{card.tag}</div>
                                    <p className="text-xs text-gray-400 mt-2 h-8 leading-tight">{card.desc}</p>
                                    {isSelected && <div className={`absolute inset-0 border-2 border-white/20 rounded-3xl animate-pulse`}></div>}
                                </button>
                            );
                        })}
                    </div>

                    {isHost ? (
                        <div className="flex flex-col items-center gap-6 w-full max-w-sm">
                             <button
                                onClick={() => onSelectGame(selectedGame)}
                                className="w-full group relative px-8 py-6 bg-white text-black rounded-2xl font-black text-xl shadow-[0_0_40px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95 overflow-hidden font-pixel"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className="relative flex items-center justify-center gap-3"><Play fill="currentColor" size={24}/> START MATCH</span>
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-4 animate-pulse">
                            <Loader2 size={48} className="text-indigo-500 animate-spin"/>
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">Waiting for Start...</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeScreen;
