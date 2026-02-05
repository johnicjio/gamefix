
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Sparkles, Send, Timer, AlertCircle, CheckCircle2, Trophy, Loader2 } from 'lucide-react';
import { audioService } from '../../services/audioService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const WordQuest: React.FC<{ playerName: string, onGameEnd: (w: string) => void }> = ({ playerName, onGameEnd }) => {
  const [currentLetter, setCurrentLetter] = useState('A');
  const [input, setInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [status, setStatus] = useState<'IDLE' | 'PLAYING' | 'CHECKING'>('IDLE');
  const [message, setMessage] = useState('Type a word starting with...');
  const [usedWords, setUsedWords] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'PLAYING' && timeLeft > 0) {
      const t = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearInterval(t);
    } else if (timeLeft === 0 && status === 'PLAYING') {
      audioService.playFailure();
      onGameEnd(score > 10 ? playerName : "Gemini AI");
    }
  }, [timeLeft, status]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setUsedWords([]);
    setCurrentLetter('A');
    setStatus('PLAYING');
    audioService.playLevelUp();
  };

  const validateWord = async (e: React.FormEvent) => {
    e.preventDefault();
    const word = input.trim().toUpperCase();
    if (word.length < 2 || word[0] !== currentLetter || usedWords.includes(word) || status === 'CHECKING') return;

    setStatus('CHECKING');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Is "${word}" a valid English word that starts with "${currentLetter}"? Answer in JSON: {"valid": boolean, "nextLetter": "string"}`,
        config: { responseMimeType: 'application/json' }
      });
      const res = JSON.parse(response.text || '{}');
      
      if (res.valid) {
        audioService.playCorrect();
        setScore(prev => prev + word.length);
        setUsedWords(prev => [...prev, word]);
        setCurrentLetter(res.nextLetter?.toUpperCase() || word[word.length-1]);
        setInput('');
        setTimeLeft(prev => Math.min(prev + 5, 30));
        setMessage("Excellent!");
      } else {
        audioService.playFailure();
        setMessage("Invalid word!");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setStatus('PLAYING');
    }
  };

  if (status === 'IDLE') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in zoom-in">
        <div className="bg-gray-900 p-12 rounded-[3rem] border border-gray-800 text-center max-w-lg shadow-2xl">
          <Trophy size={60} className="text-purple-500 mx-auto mb-8" />
          <h2 className="text-4xl font-black mb-4 tracking-tighter uppercase">Word Quest</h2>
          <p className="text-gray-500 mb-10 text-sm">Chain words together and beat the clock. Gemini validates every move.</p>
          <button onClick={startGame} className="w-full bg-white text-black font-black py-5 rounded-[2rem] text-xl shadow-xl hover:scale-105 transition-all">
            BEGIN QUEST
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto py-10 animate-in fade-in">
      <div className="w-full bg-gray-900 p-10 rounded-[3.5rem] border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gray-800">
           <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: `${(timeLeft/30)*100}%` }} />
        </div>

        <div className="flex justify-between items-center mb-12">
          <div>
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Score</div>
            <div className="text-4xl font-black text-purple-400">{score.toString().padStart(4, '0')}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Timer</div>
            <div className={`text-4xl font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>00:{timeLeft.toString().padStart(2, '0')}</div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-8 text-center">
          <div className="flex flex-col items-center">
             <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Starts with</div>
             <div className="w-32 h-32 bg-purple-600 rounded-[2.5rem] flex items-center justify-center text-7xl font-black text-white shadow-2xl shadow-purple-500/20">
               {currentLetter}
             </div>
          </div>

          <form onSubmit={validateWord} className="w-full relative">
            <input 
              autoFocus
              disabled={status === 'CHECKING'}
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full bg-transparent border-b-4 border-gray-800 p-6 text-4xl text-center font-black outline-none focus:border-purple-500 transition-all placeholder:opacity-20 uppercase"
              placeholder="TYPE HERE..."
            />
            {status === 'CHECKING' && (
              <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center gap-3">
                <Loader2 className="animate-spin text-purple-500" />
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Gemini is checking...</span>
              </div>
            )}
          </form>

          <div className="text-xs font-bold text-gray-600 italic">
            {message}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2 justify-center max-w-md">
        {usedWords.map((w, i) => (
          <span key={i} className="px-4 py-1.5 bg-gray-900 border border-gray-800 rounded-full text-[10px] font-black uppercase text-gray-500">
            {w}
          </span>
        )).reverse()}
      </div>
    </div>
  );
};

export default WordQuest;
