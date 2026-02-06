import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameProps, NPATPlayer } from '../../types';
import { validateNPATAnswers } from '../../services/geminiService';
import { Play, CheckCircle2, XCircle, Zap, Fingerprint, ShieldAlert, FileText, Database, RefreshCcw } from 'lucide-react';
import { audioService } from '../../services/audioService';

const CATEGORIES = ['name', 'place', 'animal', 'thing'] as const;
const ROUND_TIME = 30;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const NPATGame: React.FC<GameProps> = ({ network, playerName, onGameEnd }) => {
    const [gamePhase, setGamePhase] = useState<'LOBBY' | 'PLAYING' | 'ANALYSIS' | 'RESULTS'>('LOBBY');
    const [players, setPlayers] = useState<NPATPlayer[]>([]);
    const [currentLetter, setCurrentLetter] = useState('');
    const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
    const [inputs, setInputs] = useState({ name: '', place: '', animal: '', thing: '' });
    const [validationResults, setValidationResults] = useState<Record<string, boolean>>({});
    const [isScanning, setIsScanning] = useState(false);

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

    const handleAnalysis = useCallback(async () => {
        setIsScanning(true);
        setGamePhase('ANALYSIS');
        audioService.playRoll();
        
        try {
            const results = await validateNPATAnswers(currentLetter, inputs);
            setValidationResults(results);
            
            let roundTotal = 0;
            Object.values(results).forEach(v => { if(v) roundTotal += 10; });
            
            setPlayers(prev => prev.map(p => p.ownerId === myId ? {
                ...p,
                totalScore: p.totalScore + roundTotal
            } : p));
        } catch (e) {
            console.error("Validation failed", e);
        } finally {
            setIsScanning(false);
            audioService.playLevelUp();
        }
    }, [inputs, currentLetter, myId]);

    const startRound = useCallback(() => {
        const letter = LETTERS[Math.floor(Math.random() * LETTERS.length)];
        setCurrentLetter(letter);
        setGamePhase('PLAYING');
        setTimeLeft(ROUND_TIME);
        setInputs({ name: '', place: '', animal: '', thing: '' });
        setValidationResults({});
        
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(t => {
                if(t <= 5 && t > 0) audioService.playTick();
                if (t <= 1) { 
                    clearInterval(timerRef.current!);
                    handleAnalysis();
                    return 0; 
                }
                return t - 1;
            });
        }, 1000);
        audioService.playMove();
    }, [handleAnalysis]);

    if (gamePhase === 'LOBBY') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 animate-in fade-in">
                <div className="w-full max-w-xl bg-gray-900 border-2 border-cyan-500/30 rounded-[3rem] p-12 text-center shadow-2xl relative">
                    <Fingerprint size={80} className="text-cyan-500 mx-auto mb-8 animate-pulse" />
                    <h1 className="text-5xl font-black text-white mb-2 uppercase italic font-pixel">N.P.A.T</h1>
                    <div className="space-y-4 mb-12">
                        {players.map(p => (
                            <div key={p.id} className="flex items-center justify-between bg-cyan-500/5 p-5 rounded-2xl border border-cyan-500/20">
                                <span className="text-white font-bold">{p.name}</span>
                                <span className="text-[10px] font-black text-cyan-500 uppercase">Authenticated</span>
                            </div>
                        ))}
                    </div>
                    {isHost ? (
                        <button onClick={startRound} className="w-full bg-cyan-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl active:scale-95 uppercase">START MISSION</button>
                    ) : <div className="text-cyan-400 font-black animate-pulse uppercase text-xs">Waiting for Host Data...</div>}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 flex flex-col gap-6 animate-in fade-in relative py-10">
            <div className="flex justify-between items-center bg-gray-900/80 p-8 rounded-[2.5rem] border-2 border-cyan-500/30 shadow-2xl">
                <div>
                    <div className="text-[10px] font-black text-cyan-500 uppercase mb-1">Target Letter</div>
                    <div className="text-7xl font-black text-white leading-none font-pixel italic">{currentLetter}</div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black text-gray-500 uppercase mb-1">Remaining</div>
                    <div className={`text-5xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}s</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {CATEGORIES.map(cat => (
                    <div key={cat} className={`p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${inputs[cat] ? 'bg-cyan-500/10 border-cyan-500' : 'bg-gray-900 border-gray-800'}`}>
                        <div className="flex justify-between items-center mb-6">
                            <label className="text-[10px] font-black text-cyan-400/60 uppercase tracking-widest flex items-center gap-2"><FileText size={12}/> {cat}</label>
                            {gamePhase === 'ANALYSIS' && !isScanning && (
                                validationResults[cat] ? <CheckCircle2 className="text-green-500" size={24}/> : <XCircle className="text-red-500" size={24}/>
                            )}
                        </div>
                        <input 
                            type="text"
                            placeholder={`Classify ${cat}...`}
                            value={inputs[cat]}
                            onChange={(e) => setInputs({...inputs, [cat]: e.target.value.toUpperCase()})}
                            disabled={gamePhase !== 'PLAYING'}
                            className="w-full bg-transparent text-4xl font-black text-white outline-none placeholder:text-gray-800 tracking-tighter"
                        />
                    </div>
                ))}
            </div>

            {gamePhase === 'ANALYSIS' && (
                <div className="bg-gray-900 p-10 rounded-[3rem] border-2 border-cyan-500/30 animate-in slide-in-from-bottom-12 flex flex-col items-center gap-6 shadow-2xl">
                    {isScanning ? (
                        <div className="flex flex-col items-center gap-4 py-8">
                            <RefreshCcw className="text-cyan-500 animate-spin" size={48} />
                            <h2 className="text-2xl font-black text-white uppercase italic">Processing...</h2>
                        </div>
                    ) : (
                        <button onClick={startRound} className="w-full bg-white text-black py-6 rounded-2xl font-black text-xl hover:bg-gray-100 flex items-center justify-center gap-3 shadow-xl uppercase">NEXT MISSION <Play size={20} fill="currentColor"/></button>
                    )}
                </div>
            )}
        </div>
    );
};

export default NPATGame;