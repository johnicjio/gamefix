
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameProps, CarromPlayer, CarromPiece, ChatMessage } from '../../types';
import { Chat } from '../Chat';
import { User, Cpu, Volume2, VolumeX, Crown, Target, RotateCcw, Trophy, RotateCw } from 'lucide-react';
import { audioService } from '../../services/audioService';
import { generateCarromCommentary } from '../../services/geminiService';

// --- Constants & Config ---
const BOARD_WIDTH = 660; // Internal resolution (includes frame)
const PLAY_AREA_SIZE = 600;
const PLAY_OFFSET = (BOARD_WIDTH - PLAY_AREA_SIZE) / 2; // 30
const POCKET_RADIUS = 36;
const PIECE_RADIUS = 15;
const STRIKER_RADIUS = 23;
const FPS = 60;
const BOARD_PADDING = 24;

// Physics Constants
const FRICTION = 0.982; // Linear friction
const ANGULAR_FRICTION = 0.95; // Spin decay
const WALL_BOUNCE = 0.75; // Restitution
const PIECE_BOUNCE = 0.9; // Elasticity
const STOP_THRESHOLD = 0.15;
const MAX_FORCE = 40;

const BASELINES = [
    { y: PLAY_OFFSET + 495, seat: 0 },
    { y: PLAY_OFFSET + 105, seat: 1 }
];

const POCKETS = [
    { x: PLAY_OFFSET + 34, y: PLAY_OFFSET + 34 },
    { x: PLAY_OFFSET + 566, y: PLAY_OFFSET + 34 },
    { x: PLAY_OFFSET + 34, y: PLAY_OFFSET + 566 },
    { x: PLAY_OFFSET + 566, y: PLAY_OFFSET + 566 }
];

// Game State Types for the Physics Engine
interface PhysicsPiece extends CarromPiece {
    angle: number; // For visual rotation
    angularVelocity: number;
    mass: number;
}

interface Particle {
    x: number; y: number;
    vx: number; vy: number;
    life: number;
    color: string;
    size: number;
}

// Helper to generate wood texture
const createWoodTexture = () => {
    if (typeof document === 'undefined') return null;
    const cvs = document.createElement('canvas');
    cvs.width = 512; cvs.height = 512;
    const ctx = cvs.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#e3c099';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add grain
    for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(100, 70, 40, ${Math.random() * 0.05})`;
        const x = Math.random() * 512;
        const y = Math.random() * 512;
        const w = Math.random() * 200 + 50;
        const h = Math.random() * 2 + 1;
        ctx.fillRect(x, y, w, h);
    }
    return cvs;
};

const CarromGame: React.FC<GameProps> = ({ network, playerName, onGameEnd }) => {
    const [gamePhase, setGamePhase] = useState<'LOBBY' | 'PLAYING' | 'GAME_OVER'>('LOBBY');
    const [players, setPlayers] = useState<CarromPlayer[]>([
        { id: 'p1', name: playerName, seatIndex: 0, isBot: false, ownerId: 'HOST', score: 0, isReady: false, isConnected: true },
        { id: 'p2', name: 'Opponent', seatIndex: 1, isBot: true, score: 0, isReady: true, isConnected: true }
    ]);
    const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(20);
    const [messageLog, setMessageLog] = useState<string[]>([]);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [gameOverStats, setGameOverStats] = useState<{ winner: CarromPlayer | null, scores: Record<string, number> }>({ winner: null, scores: {} });
    const [soundEnabled, setSoundEnabled] = useState(true);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const stateRef = useRef({
        pieces: [] as PhysicsPiece[],
        particles: [] as Particle[],
        strikerState: 'PLACING' as 'PLACING' | 'AIMING' | 'MOVING' | 'PROCESSING',
        dragStart: null as { x: number, y: number } | null,
        dragCurrent: null as { x: number, y: number } | null,
        queenState: { status: 'BOARD', ownerIndex: null } as { status: 'BOARD' | 'PENDING' | 'COVERED', ownerIndex: number | null },
        lastPocketedSnapshot: [] as string[],
        woodPattern: null as CanvasPattern | null,
        cameraShake: 0,
        frameCount: 0
    });
    const loopRef = useRef<number>(0);

    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const isGuest = network && network.role === 'GUEST';
    const myId = network?.myId || 'HOST';
    
    const currentPlayer = players[currentTurnIndex];
    const isMyTurn = (currentPlayer.ownerId === myId) || (isHost && currentPlayer.isBot);
    const mySeat = players.find(p => p.ownerId === myId)?.seatIndex || 0;
    const isFlipped = mySeat === 1;

    const spawnParticles = (x: number, y: number, color: string) => {
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            stateRef.current.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                color,
                size: Math.random() * 4 + 2
            });
        }
    };

    const handleTurnEnd = useCallback(() => {
        const state = stateRef.current;
        const pieces = state.pieces;
        const newlyPocketed = pieces.filter(p => p.isPocketed && !state.lastPocketedSnapshot.includes(p.id));
        
        let turnContinues = false;
        const playerColor = currentTurnIndex === 0 ? 'WHITE' : 'BLACK';
        
        const striker = pieces.find(p => p.type === 'STRIKER');
        const queen = pieces.find(p => p.type === 'QUEEN');
        
        if (striker?.isPocketed) {
             setMessageLog(prev => ["Foul! Striker pocketed.", ...prev].slice(0,3));
             striker.isPocketed = false;
             const myPocketed = pieces.filter(p => p.isPocketed && p.type === playerColor && !newlyPocketed.includes(p));
             if (myPocketed.length > 0) {
                 const returnCoin = myPocketed[0];
                 returnCoin.isPocketed = false;
                 returnCoin.x = BOARD_WIDTH/2; returnCoin.y = BOARD_WIDTH/2; returnCoin.vx = 0; returnCoin.vy = 0;
             }
             if (state.queenState.status === 'PENDING' && state.queenState.ownerIndex === currentTurnIndex) {
                 state.queenState = { status: 'BOARD', ownerIndex: null };
                 if (queen) { queen.isPocketed = false; queen.x = BOARD_WIDTH/2; queen.y = BOARD_WIDTH/2; }
             }
             turnContinues = false;
        } else {
             const ownCoins = newlyPocketed.filter(p => p.type === playerColor);
             const queenPocketed = newlyPocketed.find(p => p.type === 'QUEEN');
             
             if (queenPocketed) {
                 state.queenState = { status: 'PENDING', ownerIndex: currentTurnIndex };
                 setMessageLog(prev => ["Queen Pocketed!", ...prev].slice(0,3));
                 turnContinues = true;
             }
             
             if (ownCoins.length > 0) {
                 turnContinues = true;
                 if (state.queenState.status === 'PENDING' && state.queenState.ownerIndex === currentTurnIndex) {
                     state.queenState = { status: 'COVERED', ownerIndex: currentTurnIndex };
                     setMessageLog(prev => ["Queen Covered!", ...prev].slice(0,3));
                     audioService.playLevelUp();
                 }
             } else {
                 if (state.queenState.status === 'PENDING' && state.queenState.ownerIndex === currentTurnIndex) {
                     state.queenState = { status: 'BOARD', ownerIndex: null };
                     if (queen) { queen.isPocketed = false; queen.x = BOARD_WIDTH/2; queen.y = BOARD_WIDTH/2; }
                     setMessageLog(prev => ["Queen returned.", ...prev].slice(0,3));
                 }
             }
             
             if (ownCoins.length === 0 && !queenPocketed) turnContinues = false;
        }

        const myRemaining = pieces.filter(p => p.type === playerColor && !p.isPocketed).length;
        if (myRemaining === 0) {
            const queenOk = state.queenState.status === 'COVERED' || (queen && !queen.isPocketed);
            if (queenOk) {
                 setGamePhase('GAME_OVER');
                 setGameOverStats({
                     winner: currentPlayer,
                     scores: { [currentPlayer.id]: 100 }
                 });
                 if (onGameEnd) onGameEnd(currentPlayer.name, players.filter(p => p.id !== currentPlayer.id).map(p => p.name));
                 return;
            } else {
                 setMessageLog(prev => ["Foul! Cover Queen first.", ...prev].slice(0,3));
                 const last = newlyPocketed.find(p => p.type === playerColor);
                 if (last) { last.isPocketed = false; last.x = BOARD_WIDTH/2; last.y = BOARD_WIDTH/2; }
                 turnContinues = false;
            }
        }

        state.lastPocketedSnapshot = pieces.filter(p => p.isPocketed).map(p => p.id);
        const nextIdx = turnContinues ? currentTurnIndex : (currentTurnIndex + 1) % 2;
        
        if (striker) {
            striker.vx = 0; striker.vy = 0;
            striker.x = BOARD_WIDTH/2; 
            striker.y = BASELINES[players[nextIdx].seatIndex].y;
        }
        
        state.strikerState = 'PLACING';
        setTimeLeft(20);
        setCurrentTurnIndex(nextIdx);
    }, [currentTurnIndex, currentPlayer, players, onGameEnd]);

    const updatePhysics = useCallback(() => {
        const state = stateRef.current;
        let moving = false;

        const steps = 4;
        for (let s = 0; s < steps; s++) {
            state.pieces.forEach(p => {
                if (p.isPocketed) return;
                p.x += p.vx / steps;
                p.y += p.vy / steps;
                p.angle += p.angularVelocity / steps;
                p.vx *= Math.pow(FRICTION, 1/steps);
                p.vy *= Math.pow(FRICTION, 1/steps);
                p.angularVelocity *= Math.pow(ANGULAR_FRICTION, 1/steps);

                if (Math.abs(p.vx) < STOP_THRESHOLD && Math.abs(p.vy) < STOP_THRESHOLD) {
                    p.vx = 0; p.vy = 0; p.angularVelocity = 0;
                } else {
                    moving = true;
                }

                const r = p.type === 'STRIKER' ? STRIKER_RADIUS : PIECE_RADIUS;
                const min = PLAY_OFFSET + BOARD_PADDING + r;
                const max = BOARD_WIDTH - PLAY_OFFSET - BOARD_PADDING - r;

                if (p.x < min) { p.x = min; p.vx *= -WALL_BOUNCE; if(s===0) audioService.playCarromBounce(Math.abs(p.vx)/20); }
                if (p.x > max) { p.x = max; p.vx *= -WALL_BOUNCE; if(s===0) audioService.playCarromBounce(Math.abs(p.vx)/20); }
                if (p.y < min) { p.y = min; p.vy *= -WALL_BOUNCE; if(s===0) audioService.playCarromBounce(Math.abs(p.vy)/20); }
                if (p.y > max) { p.y = max; p.vy *= -WALL_BOUNCE; if(s===0) audioService.playCarromBounce(Math.abs(p.vy)/20); }

                POCKETS.forEach(pkt => {
                    const dx = p.x - pkt.x;
                    const dy = p.y - pkt.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    if (dist < POCKET_RADIUS) {
                        p.vx += (pkt.x - p.x) * 0.05;
                        p.vy += (pkt.y - p.y) * 0.05;
                        if (dist < 10) {
                            p.isPocketed = true;
                            p.vx = 0; p.vy = 0;
                            if(s===0) {
                                if (p.type === 'QUEEN') audioService.playQueenPocket();
                                else audioService.playCarromPocket();
                                spawnParticles(p.x, p.y, p.type === 'STRIKER' ? '#fbbf24' : p.type === 'QUEEN' ? '#f43f5e' : p.type === 'WHITE' ? '#f8fafc' : '#1e293b');
                            }
                        }
                    }
                });
            });

            for (let i = 0; i < state.pieces.length; i++) {
                for (let j = i + 1; j < state.pieces.length; j++) {
                    const p1 = state.pieces[i];
                    const p2 = state.pieces[j];
                    if (p1.isPocketed || p2.isPocketed) continue;

                    const dx = p2.x - p1.x;
                    const dy = p2.y - p1.y;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const minDist = (p1.type === 'STRIKER' ? STRIKER_RADIUS : PIECE_RADIUS) + (p2.type === 'STRIKER' ? STRIKER_RADIUS : PIECE_RADIUS);

                    if (dist < minDist) {
                        const angle = Math.atan2(dy, dx);
                        const sin = Math.sin(angle);
                        const cos = Math.cos(angle);
                        const vn1 = p1.vx * cos + p1.vy * sin;
                        const vt1 = -p1.vx * sin + p1.vy * cos;
                        const vn2 = p2.vx * cos + p2.vy * sin;
                        const vt2 = -p2.vx * sin + p2.vy * cos;
                        const m1 = p1.mass;
                        const m2 = p2.mass;
                        const newVn1 = ((m1 - m2) * vn1 + 2 * m2 * vn2) / (m1 + m2);
                        const newVn2 = ((m2 - m1) * vn2 + 2 * m1 * vn1) / (m1 + m2);
                        const impactForce = Math.abs(vn1 - vn2);
                        p1.angularVelocity += vt1 * 0.05;
                        p2.angularVelocity -= vt2 * 0.05;
                        const e = PIECE_BOUNCE;
                        p1.vx = (newVn1 * cos - vt1 * sin) * e;
                        p1.vy = (newVn1 * sin + vt1 * cos) * e;
                        p2.vx = (newVn2 * cos - vt2 * sin) * e;
                        p2.vy = (newVn2 * sin + vt2 * cos) * e;
                        const overlap = minDist - dist;
                        const separationX = overlap * cos;
                        const separationY = overlap * sin;
                        const totalMass = m1 + m2;
                        p1.x -= separationX * (m2 / totalMass);
                        p1.y -= separationY * (m2 / totalMass);
                        p2.x += separationX * (m1 / totalMass);
                        p2.y += separationY * (m1 / totalMass);
                        if (s===0 && impactForce > 2) {
                            audioService.playCarromStrike(impactForce / MAX_FORCE);
                            if (impactForce > 15) state.cameraShake = 3;
                        }
                    }
                }
            }
        }

        if (!moving && state.strikerState === 'MOVING') {
            if (isHost) handleTurnEnd();
            state.strikerState = 'PROCESSING';
        }

        state.particles = state.particles.filter(p => p.life > 0).map(p => {
            p.x += p.vx; p.y += p.vy; p.life -= 0.02; p.vy += 0.2; return p;
        });

        if (state.cameraShake > 0) state.cameraShake *= 0.9;
    }, [isHost, handleTurnEnd]);

    const draw = useCallback(() => {
        const cvs = canvasRef.current;
        const ctx = cvs?.getContext('2d');
        if (!cvs || !ctx) return;
        const state = stateRef.current;

        ctx.save();
        ctx.clearRect(0, 0, cvs.width, cvs.height);
        const scale = cvs.width / BOARD_WIDTH;
        ctx.scale(scale, scale);
        
        const shakeX = (Math.random() - 0.5) * state.cameraShake;
        const shakeY = (Math.random() - 0.5) * state.cameraShake;
        ctx.translate(shakeX, shakeY);

        if (state.woodPattern) {
            ctx.fillStyle = state.woodPattern;
            ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_WIDTH);
        } else {
            ctx.fillStyle = '#e3c099';
            ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_WIDTH);
        }
        
        ctx.strokeStyle = '#3e2723';
        ctx.lineWidth = 24;
        ctx.strokeRect(0, 0, BOARD_WIDTH, BOARD_WIDTH);
        
        ctx.save();
        ctx.translate(BOARD_WIDTH/2, BOARD_WIDTH/2);
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(0, 0, 80, 0, Math.PI*2);
        ctx.stroke();
        ctx.restore();

        BASELINES.forEach(b => {
             ctx.lineWidth = 2; ctx.strokeStyle = '#000';
             ctx.beginPath(); ctx.moveTo(PLAY_OFFSET + 80, b.y); ctx.lineTo(BOARD_WIDTH - PLAY_OFFSET - 80, b.y); ctx.stroke();
        });

        ctx.fillStyle = '#111';
        POCKETS.forEach(p => {
            ctx.beginPath(); ctx.arc(p.x, p.y, POCKET_RADIUS, 0, Math.PI*2); ctx.fill();
        });

        state.pieces.forEach(p => {
            if (p.isPocketed) return;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            const r = p.type === 'STRIKER' ? STRIKER_RADIUS : PIECE_RADIUS;
            ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
            if (p.type === 'STRIKER') {
                ctx.fillStyle = '#fef08a'; ctx.fill();
            } else if (p.type === 'QUEEN') {
                ctx.fillStyle = '#f43f5e'; ctx.fill();
            } else if (p.type === 'WHITE') {
                ctx.fillStyle = '#f8fafc'; ctx.fill();
            } else {
                ctx.fillStyle = '#1e293b'; ctx.fill();
            }
            ctx.restore();
        });

        if (state.strikerState === 'AIMING' && state.dragStart && state.dragCurrent) {
            const s = state.pieces.find(pc => pc.type === 'STRIKER');
            if (s) {
                const dx = state.dragStart.x - state.dragCurrent.x;
                const dy = state.dragStart.y - state.dragCurrent.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                const power = Math.min(dist * 0.45, MAX_FORCE);
                const angle = Math.atan2(dy, dx);
                ctx.save();
                ctx.translate(s.x, s.y);
                ctx.rotate(angle);
                ctx.fillStyle = `rgba(255, ${255 - power*5}, 0, 0.6)`;
                ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(power * 3, 0); ctx.lineTo(0, 5); ctx.fill();
                ctx.restore();
            }
        }

        state.particles.forEach(p => {
            ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;
        });

        ctx.restore();
        updatePhysics();
        loopRef.current = requestAnimationFrame(draw);
    }, [updatePhysics]);

    useEffect(() => {
        loopRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(loopRef.current);
    }, [draw]);

    const initBoard = useCallback(() => {
        const pieces: PhysicsPiece[] = [];
        const cx = BOARD_WIDTH / 2;
        const cy = BOARD_WIDTH / 2;
        const createPiece = (id: string, type: CarromPiece['type'], x: number, y: number): PhysicsPiece => ({
            id, type, x, y, vx: 0, vy: 0, isPocketed: false, opacity: 1,
            angle: Math.random() * Math.PI * 2, angularVelocity: 0,
            mass: type === 'STRIKER' ? 2.5 : 1.0
        });
        pieces.push(createPiece('queen', 'QUEEN', cx, cy));
        for (let i = 0; i < 6; i++) {
            const angle = i * 60 * (Math.PI / 180);
            pieces.push(createPiece(`inner-${i}`, i % 2 === 0 ? 'WHITE' : 'BLACK', cx + Math.cos(angle) * 34, cy + Math.sin(angle) * 34));
        }
        for (let i = 0; i < 12; i++) {
            const angle = i * 30 * (Math.PI / 180);
            pieces.push(createPiece(`outer-${i}`, i % 2 === 0 ? 'WHITE' : 'BLACK', cx + Math.cos(angle) * 68, cy + Math.sin(angle) * 68));
        }
        pieces.push(createPiece('striker', 'STRIKER', cx, BASELINES[0].y));
        stateRef.current.pieces = pieces;
        stateRef.current.strikerState = 'PLACING';
        const woodImg = createWoodTexture();
        if (woodImg && canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) stateRef.current.woodPattern = ctx.createPattern(woodImg, 'repeat');
        }
    }, []);

    useEffect(() => {
        if (gamePhase === 'PLAYING') initBoard();
    }, [gamePhase, initBoard]);

    const getCanvasPos = (e: React.PointerEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return null;
        const scaleX = BOARD_WIDTH / rect.width;
        let x = (e.clientX - rect.left) * scaleX;
        let y = (e.clientY - rect.top) * scaleX;
        if (isFlipped) { x = BOARD_WIDTH - x; y = BOARD_WIDTH - y; }
        return { x, y };
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (!isMyTurn || stateRef.current.strikerState === 'MOVING') return;
        const pos = getCanvasPos(e);
        if (!pos) return;
        const striker = stateRef.current.pieces.find(p => p.type === 'STRIKER');
        if (!striker) return;
        const dx = pos.x - striker.x;
        const dy = pos.y - striker.y;
        if (Math.sqrt(dx*dx + dy*dy) < STRIKER_RADIUS * 2) {
            stateRef.current.dragStart = pos;
            stateRef.current.dragCurrent = pos;
            (e.target as Element).setPointerCapture(e.pointerId);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isMyTurn) return;
        const pos = getCanvasPos(e);
        if (!pos) return;
        const state = stateRef.current;
        const striker = state.pieces.find(p => p.type === 'STRIKER');
        if (!striker || !state.dragStart) return;
        state.dragCurrent = pos;
        if (state.strikerState === 'PLACING') {
            if (Math.abs(pos.y - state.dragStart.y) > 20) {
                state.strikerState = 'AIMING';
            } else {
                const minX = PLAY_OFFSET + BOARD_PADDING + STRIKER_RADIUS;
                const maxX = BOARD_WIDTH - PLAY_OFFSET - BOARD_PADDING - STRIKER_RADIUS;
                striker.x = Math.max(minX, Math.min(maxX, pos.x));
            }
        }
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        const state = stateRef.current;
        if (state.strikerState === 'AIMING' && state.dragStart && state.dragCurrent) {
            const dx = state.dragStart.x - state.dragCurrent.x;
            const dy = state.dragStart.y - state.dragCurrent.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const power = Math.min(dist * 0.45, MAX_FORCE);
            if (power > 5) {
                const angle = Math.atan2(dy, dx);
                const striker = state.pieces.find(p => p.type === 'STRIKER');
                if (striker) {
                    striker.vx = Math.cos(angle) * power;
                    striker.vy = Math.sin(angle) * power;
                    state.strikerState = 'MOVING';
                    audioService.playCarromStrike(Math.min(1, power/20));
                }
            } else { state.strikerState = 'PLACING'; }
        }
        state.dragStart = null; state.dragCurrent = null;
    };

    if (gamePhase === 'LOBBY') {
        return (
             <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-950 text-white p-8 rounded-[3rem] border-4 border-amber-800 shadow-2xl">
                 <h1 className="text-6xl font-black mb-8 text-amber-500 uppercase italic">Carrom Pro</h1>
                 <div className="flex gap-8 mb-8">
                     {players.map((p, i) => (
                         <div key={i} className={`p-8 border-4 rounded-3xl w-48 flex flex-col items-center ${p.ownerId === myId ? 'border-amber-500 bg-amber-900/20' : 'border-gray-700 bg-gray-900'}`}>
                             <div className="text-xl font-bold mb-2">{p.name}</div>
                             {p.ownerId === myId && (
                                 <button onClick={() => setPlayers(prev => prev.map(pl=>pl.id===p.id?{...pl, isReady:true}:pl))} className="bg-amber-500 text-black px-4 py-2 rounded-lg font-bold">{p.isReady ? 'READY' : 'READY UP'}</button>
                             )}
                         </div>
                     ))}
                 </div>
                 {isHost && <button onClick={() => setGamePhase('PLAYING')} disabled={!players.every(p=>p.isReady)} className="px-12 py-4 bg-amber-500 text-black font-black text-2xl rounded-xl disabled:opacity-50">START MATCH</button>}
             </div>
        );
    }
    
    if (gamePhase === 'GAME_OVER') {
         return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-950 text-white p-8 animate-in zoom-in">
                <Trophy size={80} className="text-yellow-400 mb-6 animate-bounce" />
                <h1 className="text-5xl font-black text-white mb-2">GAME OVER</h1>
                <div className="text-2xl text-yellow-500 font-bold mb-8">Winner: {gameOverStats.winner?.name}</div>
                {isHost && <button onClick={() => setGamePhase('LOBBY')} className="px-8 py-3 bg-indigo-600 rounded-xl font-bold flex items-center gap-2"><RotateCw/> PLAY AGAIN</button>}
            </div>
         );
    }

    return (
        <div className="flex flex-col lg:flex-row items-center gap-8 py-8 select-none touch-none">
            <div className="flex flex-col gap-4">
                 {players.map((p, i) => (
                     <div key={i} className={`p-4 rounded-xl border-2 w-40 text-center transition-all ${currentTurnIndex === i ? 'border-amber-500 bg-gray-800 scale-105' : 'border-gray-800 bg-gray-900 opacity-50'}`}>
                         <div className="text-xs text-gray-500 font-bold mb-1">{i===0 ? 'White' : 'Black'}</div>
                         <div className="font-black text-white truncate">{p.name}</div>
                         {stateRef.current.queenState.ownerIndex === i && <Crown className="mx-auto mt-2 text-amber-500" size={16}/>}
                     </div>
                 ))}
            </div>
            <div ref={containerRef} className="relative shadow-2xl rounded-[48px] overflow-hidden border-[12px] border-[#3e2723] bg-[#222]" 
                onPointerDown={handlePointerDown} 
                onPointerMove={handlePointerMove} 
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                style={{ width: 'min(90vw, 600px)', aspectRatio: '1/1' }}
            >
                <canvas ref={canvasRef} width={1200} height={1200} className="w-full h-full" />
            </div>
            <div className="flex flex-col items-center gap-6">
                <div className="bg-gray-800 p-6 rounded-2xl text-center border border-gray-700 min-w-[150px]">
                    <div className={`text-5xl font-black ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timeLeft}</div>
                </div>
                <div className="bg-gray-900/50 p-4 rounded-xl h-48 w-64 overflow-y-auto text-xs text-gray-400 font-mono scrollbar-thin">
                    {messageLog.map((m, i) => <div key={i} className="mb-1 border-b border-white/5 pb-1">{m}</div>)}
                </div>
            </div>
        </div>
    );
};

export default CarromGame;
