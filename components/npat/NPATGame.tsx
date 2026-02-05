import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameProps, NPATGameState, NPATPlayer, ChatMessage } from '../../types';
import { validateNPATAnswers } from '../../services/geminiService';
import { Chat } from '../Chat';
import { Play, Timer, CheckCircle, XCircle, RotateCw, Crown, Edit3, Send, CheckCircle2, Clock, Volume2, VolumeX } from 'lucide-react';
import { audioService } from '../../services/audioService';

const CATEGORIES = ['name', 'place', 'animal', 'thing'] as const;
const ROUND_TIME = 60;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const RainBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-gray-900">
    {Array.from({ length: 100 }).map((_, i) => (
      <div
        key={i}
        className="absolute bg-blue-400 opacity-20"
        style={{
            width: '1px',
            height: `${Math.random() * 20 + 10}px`,
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            animation: `rain ${Math.random() * 1 + 0.5}s linear infinite`,
            animationDelay: `${Math.random() * 2}s`
        }}
      />
    ))}
    <style>{` @keyframes rain { to { transform: translateY(120vh); } } `}</style>
    <div className="absolute inset-0 bg-gradient-to-b from-gray-900/80 to-blue-900/30"></div>
  </div>
);

const NPATGame: React.FC<GameProps> = ({ network, playerName, roomId, onGameEnd }) => {
    const [gamePhase, setGamePhase] = useState<NPATGameState['gamePhase']>('LOBBY');
    const [players, setPlayers] = useState<NPATPlayer[]>([]);
    const [currentLetter, setCurrentLetter] = useState('');
    const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
    const [round, setRound] = useState(1);
    const [inputs, setInputs] = useState({ name: '', place: '', animal: '', thing: '' });
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [isScoring, setIsScoring] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const myId = network?.myId || 'HOST';
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (gamePhase === 'LOBBY' && players.length === 0) {
            setPlayers([{
                id: myId, name: playerName, ownerId: myId,
                answers: { name: '', place: '', animal: '', thing: '' },
                scores: { name: 0, place: 0, animal: 0, thing: 0 },
                totalScore: 0, isReady: false
            }]);
        }
    }, [gamePhase, players.length, myId, playerName]);

    const performScoring = useCallback(async () => {
        const newPlayers = [...players];
        for (let p of newPlayers) {
            const hasContent = Object.values(p.answers).some(v => typeof v === 'string' && v.trim().length > 0);
            if (hasContent) {
                 const validation = await validateNPATAnswers(currentLetter, p.answers);
                 p.validationResults = validation as { name: boolean; place: boolean; animal: boolean; thing: boolean };
            } else {
                 p.validationResults = { name: false, place: false, animal: false, thing: false };
            }
        }
        CATEGORIES.forEach(cat => {
            const answersInCat = newPlayers
                .filter(p => p.validationResults?.[cat] && p.answers[cat]?.trim())
                .map(p => p.answers[cat].trim().toLowerCase());
            newPlayers.forEach(p => {
                if (p.validationResults?.[cat] && p.answers[cat]?.trim()) {
                    const ans = p.answers[cat].trim().toLowerCase();
                    const count = answersInCat.filter(a => a === ans).length;
                    p.scores[cat] = count > 1 ? 5 : 10;
                } else { p.scores[cat] = 0; }
            });
        });
        newPlayers.forEach(p => {
            // Fix: Explicitly cast to number[] and type roundTotal as number to ensure correct inference and fix the operator '>' error on line 88 (or 102).
            const roundTotal: number = (Object.values(p.scores) as number[]).reduce((a: number, b: number) => a + b, 0);
            p.totalScore += roundTotal;
            if (roundTotal > 0) audioService.playCorrect();
        });
        setPlayers(newPlayers);
    }, [players, currentLetter]);

    const endRound = useCallback(async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setPlayers(prev => prev.map(p => (!p.isReady ? { ...p, isReady: true } : p)));
        setGamePhase('SCORING');
        setIsScoring(true);
        audioService.playChime();
        if (isHost) { await performScoring(); setIsScoring(false); }
    }, [isHost, performScoring]);

    const startRound = useCallback(() => {
        const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        setCurrentLetter(letter);
        setGamePhase('PLAYING');
        setTimeLeft(ROUND_TIME);
        setInputs({ name: '', place: '', animal: '', thing: '' });
        setHasSubmitted(false);
        setIsScoring(false);
        setPlayers(prev => prev.map(p => ({
            ...p, answers: { name: '', place: '', animal: '', thing: '' },
            scores: { name: 0, place: 0, animal: 0, thing: 0 },
            isReady: false, validationResults: undefined
        })));
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(t => {
                if(t <= 11 && t > 0) audioService.playTick();
                if (t <= 1) { endRound(); return 0; }
                return t - 1;
            });
        }, 1000);
    }, [endRound]);

    const startGame = () => { setRound(1); startRound(); audioService.playChime(); };

    const nextRound = () => {
        if (round >= 5) {
            setGamePhase('LEADERBOARD');
             audioService.playCelebration();
             if(onGameEnd && isHost) onGameEnd(players.sort((a,b)=>b.totalScore-a.totalScore)[0].name);
        } else { setRound(r => r + 1); startRound(); }
    };

    if (gamePhase === 'LOBBY') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 bg-gray-900 text-gray-100 relative overflow-hidden">
                <RainBackground />
                <div className="bg-white/95 text-gray-800 p-8 shadow-2xl border-2 border-gray-400 max-w-2xl w-full text-center relative rounded-sm">
                    <h1 className="text-4xl font-bold mb-8 uppercase border-b-4 border-gray-800 pb-2 inline-block">Word Battle</h1>
                    {isHost && (
                        <button onClick={startGame} className="bg-green-600 text-white px-8 py-4 rounded font-bold text-xl hover:bg-green-700 w-full">
                            Start Round 1
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (gamePhase === 'LEADERBOARD') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 bg-black text-white relative">
                <RainBackground />
                <h1 className="text-5xl font-bold mb-8">Champion</h1>
                {isHost && <button onClick={() => setGamePhase('LOBBY')} className="bg-white text-gray-900 px-6 py-3 rounded font-bold">Back to Lobby</button>}
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 flex flex-col gap-6 relative min-h-[80vh]">
            <RainBackground />
            <div className="bg-white/95 rounded-xl shadow-xl p-4 flex justify-between items-center border-b-4 border-blue-500">
                <div className="text-2xl font-black text-gray-800">Round {round}/5 - Letter: <span className="text-blue-600">{currentLetter}</span></div>
                <div className={`text-3xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-gray-700'}`}> <Clock size={24} className="inline" /> {timeLeft}s </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {CATEGORIES.map(cat => (
                    <div key={cat} className="bg-white/95 p-4 rounded-xl shadow-lg border border-gray-200">
                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">{cat}</label>
                        <input 
                            type="text" value={inputs[cat]} 
                            onChange={e => setInputs({...inputs, [cat]: e.target.value})}
                            disabled={gamePhase !== 'PLAYING' || hasSubmitted}
                            className="w-full border rounded-lg p-2 font-bold text-gray-800"
                        />
                    </div>
                ))}
            </div>
            {gamePhase === 'SCORING' && (
                <div className="bg-white/95 rounded-xl p-6 border-2 border-gray-200">
                    <h3 className="text-xl font-bold mb-4 text-center">Round {round} Review</h3>
                    {isHost && !isScoring && <button onClick={nextRound} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold">Next Round</button>}
                </div>
            )}
        </div>
    );
};

export default NPATGame;
