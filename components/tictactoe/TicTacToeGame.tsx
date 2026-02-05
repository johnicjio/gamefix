
import React, { useState, useEffect, useCallback } from 'react';
import { GameProps } from '../../types';
import { audioService } from '../../services/audioService';
import { RefreshCw, User, Cpu, Trophy, Users, Loader2, Sparkles } from 'lucide-react';

type PlayerType = 'X' | 'O' | null;

const TicTacToeGame: React.FC<GameProps> = ({ playerName, onGameEnd }) => {
    const [board, setBoard] = useState<PlayerType[]>(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState<boolean>(true);
    const [winner, setWinner] = useState<PlayerType | 'Draw'>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);
    const [gameMode, setGameMode] = useState<'PVP' | 'PVE'>('PVE');
    const [isBotThinking, setIsBotThinking] = useState(false);

    const checkWinner = useCallback((squares: PlayerType[]) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
            [0, 4, 8], [2, 4, 6]             // diags
        ];
        for (let i = 0; i < lines.length; i++) {
            const [a, b, c] = lines[i];
            if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
                return { winner: squares[a], line: lines[i] };
            }
        }
        if (squares.every(s => s !== null)) return { winner: 'Draw' as const, line: null };
        return null;
    }, []);

    const handleClick = (i: number) => {
        if (board[i] || winner || (gameMode === 'PVE' && !isXNext)) return;

        const newBoard = [...board];
        newBoard[i] = isXNext ? 'X' : 'O';
        setBoard(newBoard);
        setIsXNext(!isXNext);
        audioService.playTick();

        const result = checkWinner(newBoard);
        if (result) {
            handleGameEndLocal(result);
        }
    };

    const handleGameEndLocal = (result: { winner: PlayerType | 'Draw', line: number[] | null }) => {
        setWinner(result.winner);
        setWinningLine(result.line);
        if (result.winner !== 'Draw') {
            audioService.playCelebration();
            setTimeout(() => {
                if (onGameEnd) onGameEnd(result.winner === 'X' ? playerName : (gameMode === 'PVE' ? 'Bot' : 'Player O'));
            }, 2000);
        } else {
            audioService.playFailure();
        }
    }

    // Bot Move (Simple AI)
    useEffect(() => {
        if (gameMode === 'PVE' && !isXNext && !winner) {
            setIsBotThinking(true);
            const timer = setTimeout(() => {
                const availableIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
                if (availableIndices.length > 0) {
                    // Slight priority for center
                    let moveIdx: number;
                    if (availableIndices.includes(4)) {
                        moveIdx = 4;
                    } else {
                        moveIdx = availableIndices[Math.floor(Math.random() * availableIndices.length)];
                    }
                    
                    const newBoard = [...board];
                    newBoard[moveIdx] = 'O';
                    setBoard(newBoard);
                    setIsXNext(true);
                    audioService.playTick();

                    const result = checkWinner(newBoard);
                    if (result) {
                        handleGameEndLocal(result);
                    }
                }
                setIsBotThinking(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isXNext, board, gameMode, winner, checkWinner]);

    const resetGame = () => {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);
        setWinningLine(null);
        audioService.playChime();
    };

    // Calculate winning line SVG coordinates
    const getWinningLineCoords = () => {
        if (!winningLine) return null;
        const start = winningLine[0];
        const end = winningLine[2];
        
        const getXY = (idx: number) => ({
            x: (idx % 3) * 100 + 50,
            y: Math.floor(idx / 3) * 100 + 50
        });

        const p1 = getXY(start);
        const p2 = getXY(end);
        
        return { x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y };
    };

    const lineCoords = getWinningLineCoords();

    return (
        <div className="flex flex-col items-center justify-center p-4 min-h-[60vh] font-pixel animate-in fade-in duration-700">
            <style>{`
                .neon-text-cyan { text-shadow: 0 0 8px #22d3ee, 0 0 15px #0891b2, 0 0 30px #0891b2; }
                .neon-text-pink { text-shadow: 0 0 8px #f472b6, 0 0 15px #db2777, 0 0 30px #db2777; }
                .neon-border-cyan { box-shadow: 0 0 15px #22d3ee, inset 0 0 15px #22d3ee; }
                .neon-border-pink { box-shadow: 0 0 15px #f472b6, inset 0 0 15px #f472b6; }
                .retro-grid {
                    background-image: 
                        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
                    background-size: 32px 32px;
                }
                .scanline {
                    width: 100%;
                    height: 100%;
                    z-index: 50;
                    background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.1) 50%);
                    background-size: 100% 4px;
                    pointer-events: none;
                    position: absolute;
                    top: 0; left: 0;
                }
                .winning-dash {
                    stroke-dasharray: 1000;
                    stroke-dashoffset: 1000;
                    animation: dash 0.8s ease-out forwards;
                }
                @keyframes dash {
                    to { stroke-dashoffset: 0; }
                }
                .piece-appear {
                    animation: pieceIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                }
                @keyframes pieceIn {
                    from { transform: scale(0); opacity: 0; filter: blur(10px); }
                    to { transform: scale(1); opacity: 1; filter: blur(0); }
                }
                .cell-hover:hover {
                    box-shadow: 0 0 20px rgba(255,255,255,0.05), inset 0 0 10px rgba(255,255,255,0.02);
                    background-color: rgba(255,255,255,0.03);
                }
            `}</style>

            <div className="relative w-full max-w-lg bg-[#050505] p-6 sm:p-10 rounded-[3.5rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden retro-grid">
                <div className="scanline opacity-20" />
                
                {/* Header Info */}
                <div className="flex justify-between items-center mb-12 relative z-20">
                    <div className={`flex flex-col transition-all duration-300 ${isXNext && !winner ? 'scale-110' : 'opacity-40 grayscale'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse neon-border-cyan"></div>
                            <span className="text-[9px] uppercase tracking-widest font-black text-cyan-400 neon-text-cyan">Player X</span>
                        </div>
                        <span className="text-white text-base font-bold truncate max-w-[100px]">{playerName}</span>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="bg-white/5 backdrop-blur-md p-1.5 rounded-2xl flex gap-1 border border-white/5">
                            <button 
                                onClick={() => { setGameMode('PVE'); resetGame(); }} 
                                className={`p-2.5 rounded-xl transition-all ${gameMode === 'PVE' ? 'bg-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}
                                title="VS CPU"
                            >
                                <Cpu size={18}/>
                            </button>
                            <button 
                                onClick={() => { setGameMode('PVP'); resetGame(); }} 
                                className={`p-2.5 rounded-xl transition-all ${gameMode === 'PVP' ? 'bg-pink-500 text-white shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'text-gray-500 hover:text-gray-300'}`}
                                title="VS PLAYER"
                            >
                                <Users size={18}/>
                            </button>
                        </div>
                    </div>

                    <div className={`flex flex-col items-end transition-all duration-300 ${!isXNext && !winner ? 'scale-110' : 'opacity-40 grayscale'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] uppercase tracking-widest font-black text-pink-400 neon-text-pink">Player O</span>
                            <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse neon-border-pink"></div>
                        </div>
                        <span className="text-white text-base font-bold truncate max-w-[100px]">{gameMode === 'PVE' ? 'CPU-9000' : 'Player 2'}</span>
                    </div>
                </div>

                {/* Game Board Container */}
                <div className="relative aspect-square max-w-[340px] mx-auto z-20">
                    <div className="grid grid-cols-3 gap-3 w-full h-full">
                        {board.map((square, i) => {
                            const isWinningSquare = winningLine?.includes(i);
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleClick(i)}
                                    className={`
                                        relative w-full aspect-square bg-white/[0.02] rounded-3xl flex items-center justify-center text-5xl sm:text-6xl font-black transition-all transform active:scale-90 cell-hover
                                        ${!square && !winner && isXNext && (gameMode === 'PVP' || isXNext) ? 'cursor-pointer' : 'cursor-default'}
                                        ${square === 'X' ? 'text-cyan-400 neon-text-cyan' : square === 'O' ? 'text-pink-400 neon-text-pink' : ''}
                                        ${isWinningSquare ? 'z-30' : 'z-10'}
                                    `}
                                >
                                    {square && (
                                        <div className="piece-appear">
                                            {square}
                                        </div>
                                    )}
                                    <div className="absolute inset-0 border border-white/5 rounded-3xl"></div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Winning Strike-through SVG */}
                    {lineCoords && (
                        <svg 
                            className="absolute inset-0 w-full h-full pointer-events-none z-40 overflow-visible" 
                            viewBox="0 0 300 300"
                        >
                            <line 
                                x1={lineCoords.x1} 
                                y1={lineCoords.y1} 
                                x2={lineCoords.x2} 
                                y2={lineCoords.y2} 
                                stroke={winner === 'X' ? '#22d3ee' : '#f472b6'} 
                                strokeWidth="8" 
                                strokeLinecap="round"
                                className="winning-dash"
                                style={{
                                    filter: `drop-shadow(0 0 12px ${winner === 'X' ? '#22d3ee' : '#f472b6'})`
                                }}
                            />
                        </svg>
                    )}
                </div>

                {/* Footer Controls & Status */}
                <div className="flex flex-col items-center gap-8 mt-12 relative z-20">
                    {winner ? (
                        <div className="flex flex-col items-center animate-in zoom-in duration-500">
                            {winner === 'Draw' ? (
                                <div className="text-xl font-black uppercase tracking-widest text-gray-400 italic">No One Survives.</div>
                            ) : (
                                <>
                                    <div className="relative mb-2">
                                        <Sparkles className="absolute -top-4 -left-4 text-yellow-400 animate-pulse" size={20}/>
                                        <Trophy size={48} className="text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] animate-bounce" />
                                        <Sparkles className="absolute -bottom-4 -right-4 text-yellow-400 animate-pulse delay-150" size={20}/>
                                    </div>
                                    <div className={`text-2xl font-black uppercase tracking-tighter ${winner === 'X' ? 'text-cyan-400 neon-text-cyan' : 'text-pink-400 neon-text-pink'}`}>
                                        {winner === 'X' ? playerName : (gameMode === 'PVE' ? 'CPU' : 'Player O')} Dominates!
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            {isBotThinking ? (
                                <div className="text-xs uppercase tracking-[0.4em] font-black text-pink-400 animate-pulse flex items-center gap-3 bg-pink-500/10 px-6 py-2 rounded-full border border-pink-500/20">
                                    <Loader2 className="animate-spin" size={14}/> CPU CALCULATING...
                                </div>
                            ) : (
                                <div className={`text-xs uppercase tracking-[0.4em] font-black animate-pulse px-6 py-2 rounded-full border backdrop-blur-sm
                                    ${isXNext ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-pink-400 bg-pink-500/10 border-pink-500/20'}`}>
                                    {isXNext ? `Await: ${playerName}` : 'Await: Opponent'}
                                </div>
                            )}
                        </div>
                    )}

                    <button 
                        onClick={resetGame}
                        className="group relative flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-gray-100 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <RefreshCw size={18} className="relative z-10 group-hover:rotate-180 transition-transform duration-500"/> 
                        <span className="relative z-10">REBOOT SYSTEM</span>
                    </button>
                </div>
            </div>
            
            <div className="mt-8 flex items-center gap-3 text-[9px] text-gray-800 uppercase tracking-[0.5em] font-black">
                <div className="w-1.5 h-1.5 rounded-full bg-red-950 animate-pulse"></div>
                NEON GRID SYSTEM ACTIVE // CRT_MODE_ON
                <div className="w-1.5 h-1.5 rounded-full bg-red-950 animate-pulse delay-75"></div>
            </div>
        </div>
    );
};

export default TicTacToeGame;
