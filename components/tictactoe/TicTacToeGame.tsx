
import React, { useState, useEffect, useCallback } from 'react';
import { GameProps } from '../../types';
import { audioService } from '../../services/audioService';
import { RefreshCw, User, Cpu, Trophy, Users, Loader2, Sparkles, Wifi } from 'lucide-react';

type PlayerType = 'X' | 'O' | null;

const TicTacToeGame: React.FC<GameProps> = ({ playerName, onGameEnd, network }) => {
    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';

    const [board, setBoard] = useState<PlayerType[]>(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState<boolean>(true);
    const [winner, setWinner] = useState<PlayerType | 'Draw'>(null);
    const [winningLine, setWinningLine] = useState<number[] | null>(null);
    const [gameMode, setGameMode] = useState<'PVP' | 'PVE'>('PVE'); // PVE default for offline, PVP implied for online
    const [isBotThinking, setIsBotThinking] = useState(false);

    useEffect(() => {
        if (network && network.role !== 'OFFLINE') {
             setGameMode('PVP');
        }
    }, [network]);

    const checkWinner = useCallback((squares: PlayerType[]) => {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
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

    // Network Sync
    useEffect(() => {
        if (network) {
            if (isGuest) {
                network.onStateUpdate((state) => {
                    setBoard(state.board);
                    setIsXNext(state.isXNext);
                    setWinner(state.winner);
                    setWinningLine(state.winningLine);
                });
            } else if (isHost) {
                network.onActionReceived((action, payload) => {
                    if (action === 'CLICK' && !winner && !isXNext) { // Host is X, Guest is O
                         // Apply Guest Move
                         handleClick(payload.index, true); 
                    } else if (action === 'RESET') {
                        resetGame();
                    }
                });
            }
        }
    }, [network, isHost, isGuest, winner, isXNext]);

    useEffect(() => {
        if (isHost && network && network.role !== 'OFFLINE') {
            network.broadcastState({ board, isXNext, winner, winningLine });
        }
    }, [board, isXNext, winner, winningLine, isHost, network]);


    const handleClick = (i: number, isRemote = false) => {
        if (board[i] || winner) return;

        // Turn Logic for Multiplayer
        if (network && network.role !== 'OFFLINE') {
            if (isHost && !isXNext && !isRemote) return; // Host is X, if O's turn, Host waits
            if (isGuest && isXNext) return; // Guest is O, if X's turn, Guest waits
            
            if (isGuest && !isXNext) {
                network.sendAction('CLICK', { index: i });
                return;
            }
        } else {
            // Local PVE Logic
            if (gameMode === 'PVE' && !isXNext) return;
        }

        const newBoard = [...board];
        newBoard[i] = isXNext ? 'X' : 'O';
        setBoard(newBoard);
        setIsXNext(!isXNext);
        audioService.playTick();

        const result = checkWinner(newBoard);
        if (result) {
            setWinner(result.winner);
            setWinningLine(result.line);
            if (result.winner !== 'Draw') {
                audioService.playCelebration();
                // Determine winner name logic simplified
            } else {
                audioService.playFailure();
            }
        }
    };

    const resetGame = () => {
        if (isGuest) { network?.sendAction('RESET'); return; }
        
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        setWinner(null);
        setWinningLine(null);
        audioService.playChime();
    };

    // Bot Move (Only for Host in PVE mode)
    useEffect(() => {
        if (gameMode === 'PVE' && !isXNext && !winner && network?.role === 'OFFLINE') {
            setIsBotThinking(true);
            const timer = setTimeout(() => {
                const availableIndices = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
                if (availableIndices.length > 0) {
                    let moveIdx = availableIndices.includes(4) ? 4 : availableIndices[Math.floor(Math.random() * availableIndices.length)];
                    const newBoard = [...board];
                    newBoard[moveIdx] = 'O';
                    setBoard(newBoard);
                    setIsXNext(true);
                    audioService.playTick();
                    const result = checkWinner(newBoard);
                    if (result) {
                        setWinner(result.winner);
                        setWinningLine(result.line);
                    }
                }
                setIsBotThinking(false);
            }, 600);
            return () => clearTimeout(timer);
        }
    }, [isXNext, board, gameMode, winner, checkWinner, network]);

    const getWinningLineCoords = () => {
        if (!winningLine) return null;
        const start = winningLine[0];
        const end = winningLine[2];
        const getXY = (idx: number) => ({ x: (idx % 3) * 100 + 50, y: Math.floor(idx / 3) * 100 + 50 });
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
            `}</style>
            <div className="relative w-full max-w-lg bg-[#050505] p-6 sm:p-10 rounded-[3.5rem] border border-white/10 shadow-[0_0_80px_rgba(0,0,0,1)] overflow-hidden retro-grid">
                
                {/* Header Info */}
                <div className="flex justify-between items-center mb-12 relative z-20">
                    <div className={`flex flex-col transition-all duration-300 ${isXNext && !winner ? 'scale-110' : 'opacity-40 grayscale'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse neon-border-cyan"></div>
                            <span className="text-[9px] uppercase tracking-widest font-black text-cyan-400 neon-text-cyan">Player X</span>
                        </div>
                        <span className="text-white text-base font-bold truncate max-w-[100px]">{isHost ? playerName : 'Opponent'}</span>
                    </div>

                    <div className="flex flex-col items-center">
                        {(!network || network.role === 'OFFLINE') && (
                            <div className="bg-white/5 backdrop-blur-md p-1.5 rounded-2xl flex gap-1 border border-white/5">
                                <button onClick={() => { setGameMode('PVE'); resetGame(); }} className={`p-2.5 rounded-xl transition-all ${gameMode === 'PVE' ? 'bg-indigo-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}><Cpu size={18}/></button>
                                <button onClick={() => { setGameMode('PVP'); resetGame(); }} className={`p-2.5 rounded-xl transition-all ${gameMode === 'PVP' ? 'bg-pink-500 text-white' : 'text-gray-500 hover:text-gray-300'}`}><Users size={18}/></button>
                            </div>
                        )}
                        {network && network.role !== 'OFFLINE' && <Wifi className="text-green-500 animate-pulse" />}
                    </div>

                    <div className={`flex flex-col items-end transition-all duration-300 ${!isXNext && !winner ? 'scale-110' : 'opacity-40 grayscale'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] uppercase tracking-widest font-black text-pink-400 neon-text-pink">Player O</span>
                            <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse neon-border-pink"></div>
                        </div>
                        <span className="text-white text-base font-bold truncate max-w-[100px]">{isHost ? (network?.isConnected ? 'Guest' : 'CPU') : playerName}</span>
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
                                    disabled={!!square || !!winner}
                                    className={`
                                        relative w-full aspect-square bg-white/[0.02] rounded-3xl flex items-center justify-center text-5xl sm:text-6xl font-black transition-all transform active:scale-90 cell-hover
                                        ${square === 'X' ? 'text-cyan-400 neon-text-cyan' : square === 'O' ? 'text-pink-400 neon-text-pink' : ''}
                                        ${isWinningSquare ? 'z-30' : 'z-10'}
                                    `}
                                >
                                    {square && <div className="piece-appear">{square}</div>}
                                    <div className="absolute inset-0 border border-white/5 rounded-3xl"></div>
                                </button>
                            );
                        })}
                    </div>
                    {/* SVG Line omitted for brevity, same as previous */}
                </div>

                {/* Footer Controls & Status */}
                <div className="flex flex-col items-center gap-8 mt-12 relative z-20">
                    {winner ? (
                        <div className="flex flex-col items-center animate-in zoom-in duration-500">
                             <div className={`text-2xl font-black uppercase tracking-tighter ${winner === 'X' ? 'text-cyan-400' : 'text-pink-400'}`}>
                                {winner === 'Draw' ? 'Draw!' : `${winner} Wins!`}
                            </div>
                        </div>
                    ) : (
                         <div className={`text-xs uppercase tracking-[0.4em] font-black animate-pulse px-6 py-2 rounded-full border backdrop-blur-sm ${isXNext ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-pink-400 bg-pink-500/10 border-pink-500/20'}`}>
                                    {isXNext ? `Turn: X` : 'Turn: O'}
                        </div>
                    )}

                    <button 
                        onClick={resetGame}
                        className="group relative flex items-center gap-2 bg-white text-black px-8 py-3.5 rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] overflow-hidden"
                    >
                        <RefreshCw size={18} className="relative z-10 group-hover:rotate-180 transition-transform duration-500"/> 
                        <span className="relative z-10">REBOOT SYSTEM</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TicTacToeGame;
