
import React, { useState, useEffect } from 'react';
import { GameProps } from '../../types';
import { audioService } from '../../services/audioService';
import { Scissors, Scroll, Box, Trophy, RefreshCw, Cpu, User, Zap, Wifi } from 'lucide-react';

type Choice = 'ROCK' | 'PAPER' | 'SCISSORS' | null;
type Result = 'WIN' | 'LOSE' | 'DRAW' | null;

const CHOICES: Choice[] = ['ROCK', 'PAPER', 'SCISSORS'];

const ICONS = {
    ROCK: <Box size={40} className="text-white"/>,
    PAPER: <Scroll size={40} className="text-white"/>,
    SCISSORS: <Scissors size={40} className="text-white"/>
};

const COLORS = {
    ROCK: 'bg-rose-500',
    PAPER: 'bg-blue-500',
    SCISSORS: 'bg-yellow-500'
};

const RockPaperScissorsGame: React.FC<GameProps> = ({ playerName, onGameEnd, network }) => {
    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';

    const [p1Choice, setP1Choice] = useState<Choice>(null);
    const [p2Choice, setP2Choice] = useState<Choice>(null);
    const [result, setResult] = useState<Result>(null);
    const [gameState, setGameState] = useState<'WAITING' | 'LOCKED' | 'COUNTDOWN' | 'REVEAL'>('WAITING');
    const [countdown, setCountdown] = useState(3);
    const [score, setScore] = useState({ p1: 0, p2: 0 });
    const [streak, setStreak] = useState(0);

    // Host Logic: Determine Result
    const determineWinner = (c1: Choice, c2: Choice) => {
        if (!c1 || !c2) return;
        let res: Result = 'DRAW';
        if (c1 === c2) res = 'DRAW';
        else if (
            (c1 === 'ROCK' && c2 === 'SCISSORS') ||
            (c1 === 'PAPER' && c2 === 'ROCK') ||
            (c1 === 'SCISSORS' && c2 === 'PAPER')
        ) { res = 'WIN'; } 
        else { res = 'LOSE'; }

        setResult(res);
        if (res === 'WIN') {
            setScore(s => ({ ...s, p1: s.p1 + 1 }));
            setStreak(s => s + 1);
            audioService.playCelebration();
        } else if (res === 'LOSE') {
            setScore(s => ({ ...s, p2: s.p2 + 1 }));
            setStreak(0);
            audioService.playFailure();
        } else {
            audioService.playChime();
        }
        setGameState('REVEAL');
    };

    // Network Sync
    useEffect(() => {
        if (network) {
            if (isGuest) {
                network.onStateUpdate((state) => {
                    // Sync generic state, but P2 (Host) choice remains hidden until reveal
                    if (state.phase === 'REVEAL') {
                        setP1Choice(state.p1Choice); // Actually Guest's choice echoed back
                        setP2Choice(state.p2Choice); // Host's choice revealed
                        setResult(state.result === 'WIN' ? 'LOSE' : (state.result === 'LOSE' ? 'WIN' : 'DRAW')); // Invert result
                        setScore({ p1: state.score.p2, p2: state.score.p1 }); // Invert score
                        setGameState('REVEAL');
                    } else if (state.phase === 'COUNTDOWN') {
                        setGameState('COUNTDOWN');
                        setCountdown(state.countdown);
                    } else if (state.phase === 'WAITING') {
                        resetRound(false);
                    }
                });
            } else if (isHost) {
                network.onActionReceived((action, payload) => {
                    if (action === 'CHOOSE') {
                        setP2Choice(payload.choice); // Guest is P2 for Host logic
                    } else if (action === 'RESET') {
                        resetRound();
                    }
                });
            }
        }
    }, [network, isHost, isGuest]);

    // Host watches choices to trigger countdown
    useEffect(() => {
        if (isHost && gameState === 'WAITING' && p1Choice && p2Choice) {
            setGameState('COUNTDOWN');
            setCountdown(3);
            if (network) network.broadcastState({ phase: 'COUNTDOWN', countdown: 3 });
        }
    }, [isHost, gameState, p1Choice, p2Choice, network]);

    // Countdown Timer (Host Only drives it)
    useEffect(() => {
        if (isHost && gameState === 'COUNTDOWN') {
            if (countdown > 0) {
                const t = setTimeout(() => {
                    const nextVal = countdown - 1;
                    setCountdown(nextVal);
                    if (network) network.broadcastState({ phase: 'COUNTDOWN', countdown: nextVal });
                    audioService.playTick();
                }, 1000);
                return () => clearTimeout(t);
            } else {
                determineWinner(p1Choice, p2Choice);
            }
        }
    }, [isHost, gameState, countdown, p1Choice, p2Choice]);

    // Broadcast Reveal
    useEffect(() => {
        if (isHost && gameState === 'REVEAL' && network) {
            network.broadcastState({
                phase: 'REVEAL',
                p1Choice: p2Choice, // Send Guest's choice as their P1
                p2Choice: p1Choice, // Send Host's choice as their P2
                result,
                score
            });
        }
    }, [isHost, gameState, result, score, network]);


    const playRound = (choice: Choice) => {
        if (gameState !== 'WAITING') return;

        if (isGuest) {
            setP1Choice(choice); // Visually lock locally
            setGameState('LOCKED'); // Waiting for host
            network?.sendAction('CHOOSE', { choice });
        } else {
            // Host Choice
            setP1Choice(choice);
            if (!network || network.role === 'OFFLINE') {
                // Offline Bot Mode
                const botChoice = CHOICES[Math.floor(Math.random() * 3)];
                setP2Choice(botChoice);
            } else {
                 setGameState('LOCKED'); // Wait for guest
            }
        }
    };

    const resetRound = (shouldBroadcast = true) => {
        setP1Choice(null);
        setP2Choice(null);
        setResult(null);
        setGameState('WAITING');
        setCountdown(3);
        if (isGuest) { network?.sendAction('RESET'); }
        else if (isHost && shouldBroadcast && network) { network.broadcastState({ phase: 'WAITING' }); }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 max-w-4xl mx-auto animate-in fade-in select-none">
            
            <div className="flex justify-between w-full max-w-xl mb-12 items-end">
                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(99,102,241,0.3)]">
                        <User className="text-indigo-400" />
                    </div>
                    <div className="text-white font-black uppercase tracking-widest text-sm">{playerName}</div>
                    <div className="text-3xl font-black text-indigo-400">{score.p1}</div>
                </div>

                <div className="mb-4 flex flex-col items-center">
                    {network && network.role !== 'OFFLINE' && <Wifi className="text-green-500 animate-pulse mb-2"/>}
                    <div className="text-[10px] uppercase font-black text-gray-500 tracking-[0.3em] mb-1">VS</div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                        {network && network.role !== 'OFFLINE' ? <User className="text-rose-400" /> : <Cpu className="text-rose-400" />}
                    </div>
                    <div className="text-white font-black uppercase tracking-widest text-sm">{isHost ? (network?.isConnected ? 'Guest' : 'CPU') : 'Host'}</div>
                    <div className="text-3xl font-black text-rose-400">{score.p2}</div>
                </div>
            </div>

            <div className="relative w-full max-w-lg h-64 mb-12 flex items-center justify-center">
                {gameState === 'COUNTDOWN' && (
                    <div className="text-9xl font-black text-white animate-ping">
                        {countdown > 0 ? countdown : 'GO!'}
                    </div>
                )}
                
                {gameState === 'REVEAL' && (
                    <div className="flex items-center gap-8 sm:gap-12 animate-in zoom-in duration-300">
                        <div className={`relative p-6 sm:p-8 rounded-[2rem] ${COLORS[p1Choice!]} shadow-2xl ring-4 ring-white transition-all duration-500 ${result === 'WIN' ? 'scale-125 z-10 rotate-12' : 'scale-90 opacity-50 grayscale rotate-0'}`}>
                            {ICONS[p1Choice!]}
                        </div>
                        <div className="text-4xl font-black text-white italic z-20">VS</div>
                        <div className={`relative p-6 sm:p-8 rounded-[2rem] ${COLORS[p2Choice!]} shadow-2xl ring-4 ring-white transition-all duration-500 ${result === 'LOSE' ? 'scale-125 z-10 -rotate-12' : 'scale-90 opacity-50 grayscale rotate-0'}`}>
                            {ICONS[p2Choice!]}
                        </div>
                    </div>
                )}
                
                {(gameState === 'WAITING' || gameState === 'LOCKED') && (
                    <div className="text-gray-600 font-black uppercase tracking-[0.5em] text-sm animate-pulse">
                        {gameState === 'LOCKED' ? 'Waiting for Opponent...' : 'Select Your Move'}
                    </div>
                )}
            </div>

            {gameState === 'REVEAL' ? (
                <div className="flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8">
                    <div className="text-5xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-white to-rose-400">
                        {result === 'WIN' ? 'YOU WIN!' : result === 'LOSE' ? 'YOU LOSE!' : 'DRAW!'}
                    </div>
                    <button onClick={() => resetRound()} className="px-8 py-4 bg-white text-black font-black rounded-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                        <RefreshCw size={20}/> NEXT ROUND
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-6 w-full max-w-lg">
                    {CHOICES.map(c => {
                        const isSelected = p1Choice === c;
                        return (
                            <button
                                key={c}
                                onClick={() => playRound(c)}
                                disabled={gameState !== 'WAITING'}
                                className={`group relative p-6 rounded-3xl border-4 transition-all flex flex-col items-center gap-2 disabled:cursor-not-allowed
                                    ${isSelected ? 'border-indigo-400 bg-gray-700 scale-110 shadow-[0_0_30px_rgba(99,102,241,0.4)] ring-2 ring-white z-10' : 'border-gray-700 bg-gray-800/50 hover:bg-gray-700 hover:border-white/20 disabled:opacity-50'}
                                `}
                            >
                                <div className={`transition-colors ${isSelected ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>{ICONS[c]}</div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default RockPaperScissorsGame;
