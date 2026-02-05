
import React, { useState, useEffect, useRef } from 'react';
import { Play, Timer, Type, AlertCircle, CheckCircle2, Wifi, Zap, Clock, Hash, Target, Crown, Users, User, ShieldAlert, RotateCw, Volume2, VolumeX, History, ScrollText } from 'lucide-react';
import { validateWord } from '../../services/geminiService';
import { WordPlayer, NetworkManager, GameProps, ChatMessage } from '../../types';
import { peerService } from '../../services/peerService';
import { audioService } from '../../services/audioService';
import { Chat } from '../Chat';

const getRandomLetter = () => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    return alphabet[Math.floor(Math.random() * alphabet.length)];
};

const Loader2 = ({className}:{className?:string}) => <RotateCw className={`animate-spin ${className}`} />;

const WordGame: React.FC<GameProps> = ({ network, onGameEnd, playerName, roomId }) => {
    const [gamePhase, setGamePhase] = useState<'LOBBY' | 'PLAYING'>('LOBBY');
    
    const [players, setPlayers] = useState<WordPlayer[]>([
        { id: 1, name: 'Player 1', isEliminated: false, ownerId: 'HOST' },
        { id: 2, name: 'Player 2', isEliminated: false }
    ]);
    
    const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
    const [currentLetter, setCurrentLetter] = useState('');
    const [inputWord, setInputWord] = useState('');
    
    const [totalSuccesses, setTotalSuccesses] = useState(0);
    const [level, setLevel] = useState(1);
    const [timerDuration, setTimerDuration] = useState(30);
    const [minLength, setMinLength] = useState(3);
    const [timeLeft, setTimeLeft] = useState(30);
    
    const [statusMessage, setStatusMessage] = useState('');
    const [isValidating, setIsValidating] = useState(false);
    
    const [usedWords, setUsedWords] = useState<string[]>([]);
    const [lastPlayed, setLastPlayed] = useState<{word: string, player: string} | null>(null);

    const timerRef = useRef<number | null>(null);
    const historyEndRef = useRef<HTMLDivElement>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [soundEnabled, setSoundEnabled] = useState(true);

    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';
    const myId = network?.myId || 'HOST';
    
    const [isSyncing, setIsSyncing] = useState(isGuest);
    const currentPlayer = players[currentPlayerIndex];

    useEffect(() => {
        if (gamePhase === 'PLAYING') {
            const saveState = { gamePhase, players, currentPlayerIndex, currentLetter, totalSuccesses, level, timerDuration, minLength, timeLeft, chatMessages, usedWords, lastPlayed };
            localStorage.setItem(`word_save_${roomId || 'offline'}`, JSON.stringify(saveState));
        }
    }, [gamePhase, players, currentPlayerIndex, currentLetter, totalSuccesses, level, timerDuration, minLength, timeLeft, chatMessages, roomId, usedWords, lastPlayed]);

    useEffect(() => {
        const saved = localStorage.getItem(`word_save_${roomId || 'offline'}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setGamePhase(parsed.gamePhase);
                setPlayers(parsed.players);
                setCurrentPlayerIndex(parsed.currentPlayerIndex);
                setCurrentLetter(parsed.currentLetter);
                setTotalSuccesses(parsed.totalSuccesses);
                setLevel(parsed.level);
                setTimerDuration(parsed.timerDuration);
                setMinLength(parsed.minLength);
                setTimeLeft(parsed.timeLeft);
                if (parsed.chatMessages) setChatMessages(parsed.chatMessages);
                if (parsed.usedWords) setUsedWords(parsed.usedWords);
                if (parsed.lastPlayed) setLastPlayed(parsed.lastPlayed);
            } catch(e) {}
        }
    }, []);

    useEffect(() => {
        if (historyEndRef.current) historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [usedWords]);

    useEffect(() => {
        if (statusMessage) {
            const t = setTimeout(() => setStatusMessage(''), 2500);
            return () => clearTimeout(t);
        }
    }, [statusMessage]);

    useEffect(() => {
        if (isHost && gamePhase === 'LOBBY') {
             if (players[0].ownerId === 'HOST') {
                 setPlayers(prev => prev.map(p => p.id === 1 ? { ...p, name: playerName, ownerId: myId } : p));
             }
        }
    }, [isHost, gamePhase, playerName, myId]);

    useEffect(() => {
        if (isGuest && network?.gameState) {
            const state = network.gameState;
            if (state.gameType === 'WORD_RUSH') {
                setGamePhase(state.gameState);
                setPlayers(state.players);
                setCurrentPlayerIndex(state.currentPlayerIndex);
                setCurrentLetter(state.currentLetter);
                setTotalSuccesses(state.totalSuccesses);
                setLevel(state.level);
                setTimerDuration(state.timerDuration);
                setMinLength(state.minLength);
                setTimeLeft(state.timeLeft);
                setStatusMessage(state.statusMessage);
                setChatMessages(state.chatMessages || []);
                setUsedWords(state.usedWords || []);
                setLastPlayed(state.lastPlayed || null);
                setIsSyncing(false);
            }
        }
    }, [isGuest, network?.gameState]);

    useEffect(() => {
        if (isHost && network?.role === 'HOST') {
            const payload = { gameType: 'WORD_RUSH', gameState: gamePhase, players, currentPlayerIndex, currentLetter, totalSuccesses, level, timerDuration, minLength, timeLeft, statusMessage, chatMessages, usedWords, lastPlayed };
            import('../../services/peerService').then(({peerService}) => {
                peerService.send({ type: 'STATE_UPDATE', payload });
            });
        }
    }, [isHost, network?.role, gamePhase, players, currentPlayerIndex, currentLetter, totalSuccesses, level, timerDuration, minLength, timeLeft, statusMessage, chatMessages, usedWords, lastPlayed]);

    const processSubmission = async (word: string) => {
        if (isValidating) return;
        const cleanWord = word.trim().toUpperCase();
        if (usedWords.includes(cleanWord)) {
             audioService.playFailure();
             setStatusMessage("Already Used!");
             return;
        }
        setIsValidating(true);
        if (timerRef.current) clearInterval(timerRef.current);
        const result = await validateWord(cleanWord, currentLetter, minLength);
        setIsValidating(false);

        if (result.isValid) {
            const newTotal = totalSuccesses + 1;
            setTotalSuccesses(newTotal);
            setUsedWords(prev => [...prev, cleanWord]);
            setLastPlayed({ word: cleanWord, player: players[currentPlayerIndex].name });
            let newDuration = timerDuration;
            let newMinLen = minLength;
            let levelUp = false;
            if (newTotal % 4 === 0) {
                levelUp = true;
                newDuration = Math.max(10, timerDuration - 5);
                newMinLen = minLength + 1;
                setTimerDuration(newDuration);
                setMinLength(newMinLen);
                setLevel(prev => prev + 1);
                audioService.playLevelUp();
            } else {
                audioService.playCorrect();
            }
            setStatusMessage(levelUp ? `Level Up! ${newDuration}s / >${newMinLen} chars` : "Valid!");
            setTimeout(() => { startTurn((currentPlayerIndex + 1) % players.length, newDuration); }, 1000);
        } else {
            audioService.playFailure();
            setStatusMessage(`${result.reason || "Invalid Word"}`);
            timerRef.current = window.setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { handleTimeOut(currentPlayerIndex); return 0; }
                    return prev - 1;
                });
            }, 1000);
        }
    };

    const startGame = () => {
        setGamePhase('PLAYING');
        setTotalSuccesses(0);
        setLevel(1);
        setTimerDuration(30);
        setMinLength(3);
        setPlayers(players.map(p => ({ ...p, isEliminated: false })));
        setUsedWords([]);
        setLastPlayed(null);
        setCurrentPlayerIndex(0);
        startTurn(0, 30);
        audioService.playLevelUp();
    };

    const startTurn = (playerIdx: number, duration: number) => {
        let nextIdx = playerIdx;
        let attempts = 0;
        while (players[nextIdx].isEliminated && attempts < players.length) {
            nextIdx = (nextIdx + 1) % players.length;
            attempts++;
        }
        if (attempts >= players.length) { endGame(); return; }
        setCurrentPlayerIndex(nextIdx);
        setCurrentLetter(getRandomLetter());
        setInputWord('');
        setTimeLeft(duration);
        setStatusMessage('');
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = window.setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) { handleTimeOut(nextIdx); return 0; }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTimeOut = (playerIdx: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        audioService.playFailure();
        const newPlayers = [...players];
        newPlayers[playerIdx].isEliminated = true;
        setPlayers(newPlayers);
        const remaining = newPlayers.filter(p => !p.isEliminated);
        if (remaining.length <= 1) {
             endGame();
        } else {
             setStatusMessage(`${newPlayers[playerIdx].name} Eliminated!`);
             setTimeout(() => { startTurn((playerIdx + 1) % players.length, timerDuration); }, 2000);
        }
    };

    const endGame = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        audioService.playCelebration();
        const winner = players.find(p => !p.isEliminated);
        if (winner && onGameEnd && isHost) {
            setTimeout(() => onGameEnd(winner.name), 1500);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isHost && currentPlayer.ownerId !== myId) return;
        if (isGuest) { network?.sendAction({ action: 'SUBMIT', word: inputWord }); setInputWord(''); return; }
        if (isValidating || !inputWord) return;
        processSubmission(inputWord);
    };

    const handleSendChat = (text: string) => {
        if (isHost) {
            const msg: ChatMessage = { id: Date.now().toString() + Math.random(), senderId: myId, senderName: playerName, text, timestamp: Date.now() };
            setChatMessages(prev => [...prev, msg]);
        } else {
            network?.sendAction({ action: 'CHAT', text, name: playerName });
        }
    };

    const handlersRef = useRef({ handleSubmitRemote: processSubmission, startGame, players, setPlayers, setChatMessages });
    useEffect(() => { handlersRef.current = { handleSubmitRemote: processSubmission, startGame, players, setPlayers, setChatMessages }; }, [currentLetter, minLength, currentPlayerIndex, players, totalSuccesses, timerDuration, isValidating, usedWords]);

    useEffect(() => {
        if (network) {
            network.registerActionHandler((payload, senderId) => {
                if (payload.action === 'SUBMIT' && isHost) {
                    const currentOwner = handlersRef.current.players[currentPlayerIndex]?.ownerId;
                    if (currentOwner === senderId) handlersRef.current.handleSubmitRemote(payload.word);
                } 
                else if (payload.action === 'START_GAME' && isHost) handlersRef.current.startGame();
                else if (payload.action === 'HELLO' && isHost) {
                     const { name } = payload;
                     const newPlayers = [...handlersRef.current.players];
                     const emptyIdx = newPlayers.findIndex(p => !p.ownerId);
                     if (emptyIdx !== -1) {
                         newPlayers[emptyIdx] = { ...newPlayers[emptyIdx], ownerId: senderId, name: name || `Player ${emptyIdx+1}` };
                         handlersRef.current.setPlayers(newPlayers);
                     }
                }
                else if (payload.action === 'CHAT') {
                    const { text, name } = payload;
                    setChatMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), senderId, senderName: name || 'Guest', text, timestamp: Date.now() }]);
                }
            });
        }
    }, [isHost, network]);

    if (isSyncing) return <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/95 backdrop-blur-md"><Loader2 className="w-16 h-16 text-pink-500 animate-spin" /></div>;

    if (gamePhase === 'LOBBY') {
        return (
            <div className="flex flex-col items-center justify-center p-8 max-w-2xl mx-auto animate-in fade-in duration-300">
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500 mb-6 uppercase font-pixel tracking-tighter">Word Rush Lobby</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
                    {players.map((p, i) => (
                        <div key={p.id} className={`p-6 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${p.ownerId === myId ? 'border-pink-500 bg-pink-900/20' : 'border-gray-700 bg-gray-800'}`}>
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl ${p.ownerId ? 'bg-pink-600' : 'bg-gray-600'}`}><User /></div>
                            <div className="font-bold text-lg">{p.ownerId ? p.name : 'Open Slot'}</div>
                        </div>
                    ))}
                </div>
                {isHost ? <button onClick={startGame} className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 text-white px-8 py-4 rounded-full text-xl font-bold hover:scale-105 active:scale-95 font-pixel">Start Game</button> : <div className="text-gray-500 animate-pulse">Waiting for host...</div>}
                {network && network.role !== 'OFFLINE' && <Chat messages={chatMessages} onSendMessage={handleSendChat} myId={myId} />}
            </div>
        );
    }

    const isMyTurn = currentPlayer.ownerId === myId;
    return (
        <div className="w-full max-w-4xl mx-auto flex gap-4 items-start">
            <div className="flex-1 rounded-xl overflow-hidden shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 flex flex-col h-[600px] relative">
                {statusMessage && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 py-4 rounded-xl shadow-2xl z-50 animate-in zoom-in font-bold text-xl bg-gray-100 dark:bg-gray-800 border-2">{statusMessage}</div>}
                <div className="bg-gray-900 text-white flex justify-between items-center px-4 py-3 border-b-4 border-pink-500 z-30">
                    <div className="flex items-center gap-6 font-mono tracking-widest text-sm">
                        <div className="flex flex-col items-center"><span className="text-[10px] text-gray-400">LEVEL</span><span className="font-bold text-pink-400">{level.toString().padStart(2, '0')}</span></div>
                    </div>
                    <div className={`text-4xl font-black font-mono tracking-tighter ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>00:{timeLeft.toString().padStart(2, '0')}</div>
                    <div className="flex flex-col items-center"><span className="text-[10px] text-gray-400">MIN LEN</span><span className="font-bold text-purple-400">{minLength}</span></div>
                </div>
                <div className="flex-1 relative flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-800/50">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gray-700"><div className="h-full bg-pink-500 transition-all duration-1000 ease-linear" style={{ width: `${(timeLeft / timerDuration) * 100}%` }} /></div>
                    <div className="text-center z-10 w-full max-w-md">
                        {lastPlayed && <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 flex items-center gap-2 animate-in slide-in-from-top-4"><span className="text-xs text-gray-300">Last:</span><span className="text-sm font-bold text-pink-500">{lastPlayed.word}</span></div>}
                        <div className="text-3xl font-black text-gray-100 mb-8 flex items-center justify-center gap-2">{currentPlayer.name}</div>
                        <div className="relative mb-10"><span className="text-9xl font-black text-gray-100 drop-shadow-2xl">{currentLetter}</span></div>
                        <form onSubmit={handleSubmit} className="w-full relative"><input type="text" autoFocus value={inputWord} onChange={e => setInputWord(e.target.value.toUpperCase())} placeholder={isMyTurn ? "TYPE HERE..." : `WAITING...`} className={`w-full bg-transparent text-center text-4xl font-mono font-bold border-b-4 outline-none py-4 uppercase ${isMyTurn ? 'border-gray-600 focus:border-pink-500 text-gray-100' : 'border-gray-700 text-gray-400 cursor-not-allowed'}`} disabled={isValidating || !isMyTurn} /></form>
                    </div>
                </div>
                <div className="bg-gray-900 border-t border-gray-800 p-4 flex justify-center gap-4">
                    {players.map(p => <div key={p.id} className={`flex flex-col items-center min-w-[80px] px-3 py-2 rounded-lg border-2 transition-all ${p.isEliminated ? 'opacity-40 grayscale' : p.id === currentPlayer.id ? 'border-pink-500 bg-pink-900/20 scale-105' : 'bg-gray-800'}`}><span className="text-xs font-bold text-gray-300">{p.name}</span></div>)}
                </div>
            </div>
        </div>
    );
};

export default WordGame;
