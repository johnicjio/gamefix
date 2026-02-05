
import React from 'react';
import { Crown, RotateCcw, Home, Trophy, Star, PartyPopper } from 'lucide-react';
import { GameType } from '../types';

interface EndScreenProps {
    winnerName: string;
    isHost: boolean;
    onReset: () => void; // Go to menu
    onRestart: () => void; // Restart same game
    gameType: GameType;
}

const EndScreen: React.FC<EndScreenProps> = ({ winnerName, isHost, onReset, onRestart, gameType }) => {
    const getGameTitle = () => {
        switch (gameType) {
            case GameType.LUDO: return "Ludo Classic";
            case GameType.SNAKE: return "Pixel Climber";
            case GameType.WORD: return "Word Rush";
            case GameType.TIC_TAC_TOE: return "Neon Tic-Tac";
            case GameType.CANDY_LAND: return "Candy Land";
            case GameType.BRAWLER: return "Pixel Brawlers";
            default: return "The Arena";
        }
    };

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center overflow-hidden animate-in fade-in duration-1000">
            <style>{`
                @keyframes confetti-fall {
                    0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; }
                    100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
                }
                .confetti {
                    position: absolute;
                    width: 10px;
                    height: 10px;
                    background: #f0f;
                    animation: confetti-fall 4s linear infinite;
                }
                .glow-text {
                    text-shadow: 0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(79, 70, 229, 0.3);
                }
            `}</style>

            {/* Background Layers */}
            <div className="absolute inset-0 bg-gray-950">
                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_50%,#4f46e5_0%,transparent_70%)] animate-pulse" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
            </div>

            {/* Confetti Elements */}
            {[...Array(30)].map((_, i) => (
                <div 
                    key={i} 
                    className="confetti" 
                    style={{
                        left: `${Math.random() * 100}%`,
                        backgroundColor: ['#4f46e5', '#ec4899', '#10b981', '#f59e0b'][i % 4],
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${3 + Math.random() * 2}s`
                    }}
                />
            ))}

            <div className="relative max-w-2xl w-full p-8 text-center flex flex-col items-center z-10 animate-in zoom-in slide-in-from-bottom-12 duration-700">
                
                <div className="relative mb-8">
                    <div className="absolute inset-0 blur-3xl bg-yellow-400/20 rounded-full scale-150 animate-pulse" />
                    <Trophy size={120} className="text-yellow-400 relative drop-shadow-[0_0_40px_rgba(250,204,21,0.6)] animate-bounce" />
                    <div className="absolute -top-4 -right-4 bg-white text-black p-2 rounded-full shadow-xl">
                        <PartyPopper size={24} />
                    </div>
                </div>

                <div className="space-y-2 mb-10">
                    <h2 className="text-sm font-black text-indigo-400 uppercase tracking-[0.5em] animate-pulse">
                        Mission Accomplished
                    </h2>
                    <h1 className="text-7xl sm:text-8xl font-black text-white glow-text tracking-tighter uppercase italic leading-none">
                        VICTORY
                    </h1>
                    <div className="text-gray-500 font-bold uppercase tracking-widest text-xs">
                        {getGameTitle()}
                    </div>
                </div>
                
                <div className="group relative w-full max-w-md p-1 rounded-[2.5rem] bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 shadow-2xl mb-12">
                    <div className="bg-gray-900 rounded-[2.3rem] py-8 px-6 flex flex-col items-center gap-2">
                        <div className="flex items-center gap-2 text-gray-400 text-[10px] font-black uppercase tracking-[0.3em]">
                            <Star size={12} className="text-yellow-500" /> Grand Champion <Star size={12} className="text-yellow-500" />
                        </div>
                        <div className="text-5xl sm:text-6xl font-black text-white truncate max-w-full px-4 drop-shadow-lg">
                            {winnerName}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                    {isHost && (
                        <button 
                            onClick={onRestart}
                            className="flex-1 flex items-center justify-center gap-3 bg-white text-black px-8 py-5 rounded-2xl font-black text-lg shadow-[0_10px_40px_rgba(255,255,255,0.2)] transition-all hover:scale-105 active:scale-95 hover:bg-gray-100"
                        >
                            <RotateCcw size={22} /> PLAY AGAIN
                        </button>
                    )}
                    <button 
                        onClick={onReset}
                        className="flex-1 flex items-center justify-center gap-3 bg-gray-800 text-white px-8 py-5 rounded-2xl font-black text-lg border border-white/10 transition-all hover:scale-105 active:scale-95 hover:bg-gray-700 shadow-xl"
                    >
                        <Home size={22} /> MAIN MENU
                    </button>
                </div>

                <div className="mt-12 text-[9px] text-gray-600 font-black uppercase tracking-[0.6em]">
                    The Arena • Session Closed
                </div>
            </div>
        </div>
    );
};

export default EndScreen;
