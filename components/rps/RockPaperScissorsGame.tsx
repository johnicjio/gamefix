
import React, { useState, useEffect } from 'react';
import { GameProps } from '../../types';
import { audioService } from '../../services/audioService';
import { Scissors, Scroll, Box, User, Cpu, Wifi, Loader2, RefreshCw } from 'lucide-react';

type Choice = 'ROCK' | 'PAPER' | 'SCISSORS' | null;
type Result = 'WIN' | 'LOSE' | 'DRAW' | null;

const CHOICES: Choice[] = ['ROCK', 'PAPER', 'SCISSORS'];
const ICONS = { ROCK: <Box size={40}/>, PAPER: <Scroll size={40}/>, SCISSORS: <Scissors size={40}/> };
const COLORS = { ROCK: 'bg-rose-500', PAPER: 'bg-blue-500', SCISSORS: 'bg-yellow-500' };

const RockPaperScissorsGame: React.FC<GameProps> = ({ playerName, onGameEnd, network }) => {
    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';
    const isConnected = network?.isConnected ?? false;
    
    const [myChoice, setMyChoice] = useState<Choice>(null);
    const [oppChoice, setOppChoice] = useState<Choice>(null);
    const [oppLocked, setOppLocked] = useState(false);
    const [gameState, setGameState] = useState<'WAITING' | 'REVEAL'>('WAITING');
    const [result, setResult] = useState<Result>(null);
    const [score, setScore] = useState({ me: 0, opp: 0 });
    const [isAIOpponent, setIsAIOpponent] = useState(!isConnected);

    // Monitor connection and switch to AI if lost
    useEffect(() => {
        if (!isConnected && !isHost && network?.role !== 'OFFLINE') {
            // If we were guest and lost connection, we are alone
            setIsAIOpponent(true);
        } else if (!isConnected && isHost && network?.role === 'HOST') {
            // Host lost guest, switch to AI
            setIsAIOpponent(true);
        } else if (isConnected) {
            setIsAIOpponent(false);
        }
    }, [isConnected, isHost, network?.role]);

    useEffect(() => {
        if (network) {
            if (isGuest && !isAIOpponent) {
                network.onStateUpdate((state) => {
                    if (state.type === 'LOCK') setOppLocked(true);
                    else if (state.type === 'REVEAL') {
                        setOppChoice(state.hostChoice);
                        revealResults(state.hostChoice);
                    } else if (state.type === 'RESET') { resetRound(); }
                });
            } else if (isHost) {
                network.onActionReceived((action, payload) => {
                    if (action === 'CHOOSE' && !isAIOpponent) { setOppChoice(payload.choice); setOppLocked(true); }
                });
            }
        }
    }, [network, isHost, isGuest, myChoice, isAIOpponent]);

    // AI Logic
    useEffect(() => {
        if (isAIOpponent && myChoice && !oppChoice && gameState === 'WAITING') {
            const t = setTimeout(() => {
                const choice = CHOICES[Math.floor(Math.random() * 3)];
                setOppChoice(choice);
                setOppLocked(true);
                revealResults(choice);
            }, 800);
            return () => clearTimeout(t);
        }
    }, [isAIOpponent, myChoice, oppChoice, gameState]);

    useEffect(() => {
        if (isHost && myChoice && oppChoice && gameState === 'WAITING' && !isAIOpponent) {
            revealResults(oppChoice);
            network?.broadcastState({ type: 'REVEAL', hostChoice: myChoice });
        } else if (isHost && myChoice && !oppChoice && !isAIOpponent) {
            network?.broadcastState({ type: 'LOCK' });
        }
    }, [isHost, myChoice, oppChoice, gameState, network, isAIOpponent]);

    const revealResults = (otherChoice: Choice) => {
        const res = otherChoice === myChoice ? 'DRAW' : ( (otherChoice === 'ROCK' && myChoice === 'SCISSORS') || (otherChoice === 'SCISSORS' && myChoice === 'PAPER') || (otherChoice === 'PAPER' && myChoice === 'ROCK') ) ? 'LOSE' : 'WIN';
        setResult(res);
        setGameState('REVEAL');
        setScore(s => ({ me: s.me + (res === 'WIN' ? 1 : 0), opp: s.opp + (res === 'LOSE' ? 1 : 0) }));
        audioService.playChime();
    };

    const resetRound = () => {
        setGameState('WAITING');
        setMyChoice(null);
        setOppChoice(null);
        setOppLocked(false);
        if (isHost && !isAIOpponent) network?.broadcastState({ type: 'RESET' });
    };

    const makeChoice = (c: Choice) => {
        if (myChoice) return;
        setMyChoice(c);
        if (isGuest && !isAIOpponent) network?.sendAction('CHOOSE', { choice: c });
        audioService.playTick();
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in">
            <div className="flex justify-between w-full max-w-xl mb-12">
                <div className="text-center"><div className="text-3xl font-black text-white">{score.me}</div><div className="text-[10px] text-gray-500 uppercase">{playerName}</div></div>
                <div className="text-center flex flex-col items-center gap-1">
                    <div className="font-pixel text-gray-700 text-xs">VS</div>
                    {isAIOpponent && <span className="text-[8px] text-amber-500 font-black px-2 py-0.5 border border-amber-500/30 rounded uppercase tracking-widest animate-pulse">CPU MODE</span>}
                </div>
                <div className="text-center"><div className="text-3xl font-black text-white">{score.opp}</div><div className="text-[10px] text-gray-500 uppercase">{isAIOpponent ? 'CPU' : 'OPPONENT'}</div></div>
            </div>

            <div className="h-48 flex items-center justify-center mb-12">
                {gameState === 'REVEAL' ? (
                    <div className="flex gap-12 animate-in zoom-in">
                        <div className={`p-8 rounded-3xl ${COLORS[myChoice!]}`}>{ICONS[myChoice!]}</div>
                        <div className="text-4xl font-black flex items-center">VS</div>
                        <div className={`p-8 rounded-3xl ${COLORS[oppChoice!]}`}>{ICONS[oppChoice!]}</div>
                    </div>
                ) : (
                    <div className="text-center">
                        {myChoice ? <div className="text-green-500 flex items-center gap-2"><Loader2 size={24} className="animate-spin"/> WAITING...</div> : oppLocked ? <div className="text-yellow-500 uppercase font-black tracking-widest animate-pulse">Opponent Locked!</div> : <div className="text-gray-600 font-pixel text-xs">CHOOSE YOUR WEAPON</div>}
                    </div>
                )}
            </div>

            {gameState === 'REVEAL' ? (
                <div className="text-center">
                    <div className={`text-4xl font-black mb-6 uppercase ${result === 'WIN' ? 'text-green-500' : result === 'LOSE' ? 'text-rose-500' : 'text-gray-400'}`}>{result === 'WIN' ? 'Victory!' : result === 'LOSE' ? 'Defeat' : 'Draw'}</div>
                    <button onClick={resetRound} className="px-10 py-4 bg-white text-black font-black rounded-2xl flex items-center gap-2 transition-transform active:scale-95"><RefreshCw size={20}/> NEXT ROUND</button>
                </div>
            ) : (
                <div className="grid grid-cols-3 gap-6 w-full max-w-lg">
                    {CHOICES.map(c => (
                        <button key={c} onClick={() => makeChoice(c)} disabled={!!myChoice} className={`p-8 rounded-3xl border-4 transition-all ${myChoice === c ? 'border-white scale-110 shadow-2xl' : 'border-gray-800 bg-gray-900 opacity-60 hover:opacity-100 hover:border-gray-600 active:scale-90'}`}>
                            {ICONS[c]}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RockPaperScissorsGame;
