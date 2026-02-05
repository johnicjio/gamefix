
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameProps } from '../../types';
import { audioService } from '../../services/audioService';
import { Heart, Trophy, RefreshCw, Move, Gamepad2, Info, Zap } from 'lucide-react';

// --- Constants ---
const WIDTH = 800;
const HEIGHT = 500;
const GRAVITY = 0.55;
const FRICTION = 0.88;
const PLAYER_SIZE = 30;
const JUMP_FORCE = -11.5;
const MOVE_SPEED = 0.75;
const MAX_SPEED = 5.5;
const POW_COOLDOWN = 180; // 3 seconds at 60fps

interface Platform {
    x: number;
    y: number;
    w: number;
    h: number;
    type: 'NORMAL' | 'POW';
}

interface Entity {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    lives: number;
    isBot: boolean;
    name: string;
    onGround: boolean;
    invincible: number;
    stunned: number;
    score: number;
    avatar: string;
}

const BrawlerGame: React.FC<GameProps> = ({ playerName, onGameEnd }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
    const [winner, setWinner] = useState<string | null>(null);

    // Game state references for the loop
    const playersRef = useRef<Entity[]>([]);
    const powStateRef = useRef({ cooldown: 0, active: 0 });
    
    const platformsRef = useRef<Platform[]>([
        // Floor
        { x: 0, y: 460, w: 300, h: 20, type: 'NORMAL' },
        { x: 500, y: 460, w: 300, h: 20, type: 'NORMAL' },
        // Middle Floor (Wrap-around gap)
        { x: 300, y: 460, w: 200, h: 20, type: 'NORMAL' },
        
        // Tier 1
        { x: 100, y: 340, w: 180, h: 15, type: 'NORMAL' },
        { x: 520, y: 340, w: 180, h: 15, type: 'NORMAL' },
        
        // Tier 2 (POW Level)
        { x: 340, y: 240, w: 120, h: 25, type: 'POW' }, // THE POW BLOCK
        { x: 0, y: 220, w: 120, h: 15, type: 'NORMAL' },
        { x: 680, y: 220, w: 120, h: 15, type: 'NORMAL' },
        
        // Tier 3
        { x: 180, y: 120, w: 160, h: 15, type: 'NORMAL' },
        { x: 460, y: 120, w: 160, h: 15, type: 'NORMAL' },
    ]);
    
    const keysRef = useRef<Record<string, boolean>>({});

    const initGame = () => {
        playersRef.current = [
            { id: 'p1', x: 200, y: 400, vx: 0, vy: 0, color: '#ef4444', lives: 3, isBot: false, name: playerName, onGround: false, invincible: 0, stunned: 0, score: 0, avatar: '👨‍🔧' },
            { id: 'p2', x: 550, y: 400, vx: 0, vy: 0, color: '#22c55e', lives: 3, isBot: true, name: 'Luigi-Bot', onGround: false, invincible: 0, stunned: 0, score: 0, avatar: '👷‍♂️' },
            { id: 'p3', x: 100, y: 50, vx: 0, vy: 0, color: '#3b82f6', lives: 3, isBot: true, name: 'Wario-Bot', onGround: false, invincible: 0, stunned: 0, score: 0, avatar: '🧛' },
            { id: 'p4', x: 650, y: 50, vx: 0, vy: 0, color: '#eab308', lives: 3, isBot: true, name: 'Waluigi-Bot', onGround: false, invincible: 0, stunned: 0, score: 0, avatar: '🧟' },
        ];
        powStateRef.current = { cooldown: 0, active: 0 };
        setGameState('PLAYING');
        setWinner(null);
        audioService.playLevelUp();
    };

    // --- Physics Engine ---
    const update = useCallback(() => {
        if (gameState !== 'PLAYING') return;

        const players = playersRef.current;
        const platforms = platformsRef.current;
        const pow = powStateRef.current;

        if (pow.cooldown > 0) pow.cooldown--;
        if (pow.active > 0) pow.active--;

        players.forEach(p => {
            if (p.lives <= 0) return;

            // State cooldowns
            if (p.invincible > 0) p.invincible--;
            if (p.stunned > 0) {
                p.stunned--;
                p.vx *= 0.8; // Heavy friction while stunned
            }

            // Input Handling
            if (p.stunned <= 0) {
                if (!p.isBot) {
                    if (keysRef.current['KeyA'] || keysRef.current['ArrowLeft']) p.vx -= MOVE_SPEED;
                    if (keysRef.current['KeyD'] || keysRef.current['ArrowRight']) p.vx += MOVE_SPEED;
                    if ((keysRef.current['Space'] || keysRef.current['KeyW'] || keysRef.current['ArrowUp']) && p.onGround) {
                        p.vy = JUMP_FORCE;
                        p.onGround = false;
                        audioService.playTick();
                    }
                } else {
                    // SMB3 AI: Simple chase + jump
                    const target = players.find(other => other.id !== p.id && other.lives > 0);
                    if (target) {
                        // Horizontal movement with wrap consideration
                        let dx = target.x - p.x;
                        if (Math.abs(dx) > WIDTH / 2) dx = -Math.sign(dx) * (WIDTH - Math.abs(dx));
                        
                        if (dx < -10) p.vx -= MOVE_SPEED * 0.7;
                        else if (dx > 10) p.vx += MOVE_SPEED * 0.7;

                        if (p.onGround && (target.y < p.y - 40 || Math.random() < 0.01)) {
                            p.vy = JUMP_FORCE;
                            p.onGround = false;
                        }
                    }
                }
            }

            // Apply Physics
            p.vx *= FRICTION;
            p.vy += GRAVITY;
            if (Math.abs(p.vx) > MAX_SPEED) p.vx = Math.sign(p.vx) * MAX_SPEED;

            p.x += p.vx;
            p.y += p.vy;

            // --- Screen Wrapping (The Mario Battle Classic) ---
            if (p.x < -PLAYER_SIZE) p.x = WIDTH;
            if (p.x > WIDTH) p.x = -PLAYER_SIZE;

            // Platform Collision
            p.onGround = false;
            platforms.forEach(plat => {
                // Landing on platform
                if (
                    p.x < plat.x + plat.w &&
                    p.x + PLAYER_SIZE > plat.x &&
                    p.y + PLAYER_SIZE > plat.y &&
                    p.y + PLAYER_SIZE < plat.y + plat.h + 15 &&
                    p.vy >= 0
                ) {
                    p.y = plat.y - PLAYER_SIZE;
                    p.vy = 0;
                    p.onGround = true;
                }
                
                // Hitting head on platform (Especially for POW)
                if (
                    p.x < plat.x + plat.w &&
                    p.x + PLAYER_SIZE > plat.x &&
                    p.y > plat.y + plat.h - 10 &&
                    p.y < plat.y + plat.h + 5 &&
                    p.vy < 0
                ) {
                    p.vy = 2; // Bounce down
                    if (plat.type === 'POW' && pow.cooldown <= 0) {
                        // ACTIVATE POW!
                        pow.cooldown = POW_COOLDOWN;
                        pow.active = 15;
                        audioService.playCapture();
                        // Stun everyone on the ground (except the hitter if they landed fast)
                        players.forEach(other => {
                            if (other.onGround) {
                                other.stunned = 120; // 2 seconds
                                other.vy = -5; // Little hop
                            }
                        });
                    }
                }
            });

            // Fall out of bounds (The Pit)
            if (p.y > HEIGHT) {
                p.lives--;
                p.x = WIDTH / 2;
                p.y = 0;
                p.vx = 0;
                p.vy = 0;
                p.stunned = 0;
                p.invincible = 120;
                audioService.playFailure();
            }
        });

        // Player vs Player Combat (The Stomp)
        for (let i = 0; i < players.length; i++) {
            for (let j = 0; j < players.length; j++) {
                if (i === j) continue;
                const p1 = players[i];
                const p2 = players[j];

                if (p1.lives <= 0 || p2.lives <= 0) continue;

                if (
                    p1.x < p2.x + PLAYER_SIZE &&
                    p1.x + PLAYER_SIZE > p2.x &&
                    p1.y + PLAYER_SIZE > p2.y &&
                    p1.y + PLAYER_SIZE < p2.y + PLAYER_SIZE / 2 &&
                    p1.vy > 0 &&
                    p2.invincible <= 0
                ) {
                    // P1 stomps P2
                    if (p2.stunned > 0) {
                        // Kicked while down!
                        p2.lives--;
                        p2.invincible = 90;
                        p1.score += 200;
                        audioService.playCapture();
                    } else {
                        // Regular stomp just bounces
                        p2.stunned = 60;
                        p1.vy = JUMP_FORCE * 0.7;
                        p1.score += 50;
                        audioService.playMove();
                    }
                }
            }
        }

        // Win Condition
        const alivePlayers = players.filter(p => p.lives > 0);
        if (alivePlayers.length === 1 && gameState === 'PLAYING') {
            setGameState('GAMEOVER');
            setWinner(alivePlayers[0].name);
            audioService.playCelebration();
            if (onGameEnd) onGameEnd(alivePlayers[0].name);
        }
    }, [gameState, onGameEnd]);

    // --- Render Loop ---
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        const players = playersRef.current;
        const platforms = platformsRef.current;
        const pow = powStateRef.current;

        // Background
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, WIDTH, HEIGHT);

        // Grid Design (Retro feel)
        ctx.strokeStyle = '#1f2937';
        ctx.lineWidth = 1;
        for (let x = 0; x < WIDTH; x += 40) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
        }

        // POW Active Screen Shake
        if (pow.active > 0) {
            const sx = (Math.random() - 0.5) * 10;
            const sy = (Math.random() - 0.5) * 10;
            ctx.translate(sx, sy);
        }

        // Platforms
        platforms.forEach(plat => {
            if (plat.type === 'POW') {
                const color = pow.cooldown > 0 ? '#4b5563' : '#3b82f6';
                ctx.fillStyle = color;
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 3;
                ctx.strokeRect(plat.x + 4, plat.y + 4, plat.w - 8, plat.h - 8);
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px "Press Start 2P"';
                ctx.textAlign = 'center';
                ctx.fillText('POW', plat.x + plat.w/2, plat.y + 18);
            } else {
                // Bricks
                ctx.fillStyle = '#7c2d12'; // Brick red
                ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
                ctx.strokeStyle = '#450a0a';
                ctx.lineWidth = 2;
                ctx.strokeRect(plat.x, plat.y, plat.w, plat.h);
                // Detail lines for bricks
                for (let bx = 20; bx < plat.w; bx += 20) {
                    ctx.beginPath(); ctx.moveTo(plat.x + bx, plat.y); ctx.lineTo(plat.x + bx, plat.y + plat.h); ctx.stroke();
                }
            }
        });

        // Players
        players.forEach(p => {
            if (p.lives <= 0) return;

            ctx.save();
            if (p.invincible > 0 && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.3;
            
            // Stunned shake
            if (p.stunned > 0) {
                ctx.translate((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4);
                ctx.rotate(Math.PI); // Upside down like classic Mario
                ctx.translate(-p.x - PLAYER_SIZE/2, -p.y - PLAYER_SIZE/2);
            } else {
                ctx.translate(p.x, p.y);
            }

            // Sprite Box
            ctx.fillStyle = p.color;
            ctx.fillRect(0, 0, PLAYER_SIZE, PLAYER_SIZE);
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.strokeRect(0, 0, PLAYER_SIZE, PLAYER_SIZE);
            
            // Character Icon
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(p.avatar, PLAYER_SIZE / 2, PLAYER_SIZE - 5);
            
            // Player Tag
            ctx.restore();
            ctx.font = '8px "Press Start 2P"';
            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText(p.name, p.x + PLAYER_SIZE/2, p.y - 12);
            
            // Lives
            for(let i=0; i<p.lives; i++) {
                ctx.fillStyle = '#ef4444';
                ctx.fillRect(p.x + (i*8), p.y - 25, 6, 6);
            }
        });

        // Reset translate if shaken
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Loop
        if (gameState === 'PLAYING') {
            update();
            requestAnimationFrame(draw);
        }
    }, [gameState, update]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => keysRef.current[e.code] = true;
        const handleKeyUp = (e: KeyboardEvent) => keysRef.current[e.code] = false;
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        if (gameState === 'PLAYING') draw();

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState, draw]);

    return (
        <div className="flex flex-col items-center w-full max-w-5xl mx-auto p-4 gap-6 select-none font-pixel overflow-hidden">
            <style>{`
                .pixel-border {
                    box-shadow: 
                        0 -4px 0 0 #000,
                        0 4px 0 0 #000,
                        -4px 0 0 0 #000,
                        4px 0 0 0 #000;
                }
            `}</style>

            <div className="text-center relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] text-blue-500 animate-pulse font-black uppercase tracking-[0.5em]">
                    BATTLE MODE
                </div>
                <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-white to-green-500 uppercase tracking-widest italic mb-2">
                    Pixel Brawlers
                </h1>
            </div>

            <div className="relative w-full max-w-[800px] aspect-[8/5] bg-black pixel-border p-1 overflow-hidden ring-4 ring-gray-800">
                <canvas 
                    ref={canvasRef} 
                    width={WIDTH} 
                    height={HEIGHT} 
                    className="w-full h-full cursor-crosshair"
                />

                {gameState === 'START' && (
                    <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
                        <Zap size={64} className="text-yellow-400 mb-6 animate-bounce" />
                        <h2 className="text-3xl font-black text-white mb-4 uppercase tracking-tighter">Arena Awaits</h2>
                        <div className="bg-white/5 border border-white/10 p-6 rounded-2xl mb-8 max-w-sm text-left backdrop-blur-md">
                            <h3 className="flex items-center gap-2 font-bold text-blue-400 mb-3 text-xs uppercase underline decoration-wavy">Rules of Engagement</h3>
                            <ul className="space-y-3 text-[9px] text-gray-400 leading-normal uppercase">
                                <li className="flex gap-2"><Move size={12}/> Use <span className="text-white">WASD</span> to Move</li>
                                <li className="flex gap-2">🌍 <span className="text-blue-400">SCREEN WRAPS</span> - Go left, appear right!</li>
                                <li className="flex gap-2">📦 Hit <span className="text-yellow-500">POW</span> blocks to stun ground enemies</li>
                                <li className="flex gap-2">🎯 Stomp heads to <span className="text-red-500">ELIMINATE</span></li>
                            </ul>
                        </div>
                        <button 
                            onClick={initGame}
                            className="px-12 py-4 bg-white text-black font-black text-xl rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)]"
                        >
                            JOIN BATTLE
                        </button>
                    </div>
                )}

                {gameState === 'GAMEOVER' && (
                    <div className="absolute inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in">
                        <Trophy size={80} className="text-yellow-400 mb-4 animate-bounce" />
                        <h2 className="text-4xl font-black text-white mb-2 tracking-tighter uppercase italic">{winner} Wins!</h2>
                        <p className="text-gray-400 font-bold text-xs mb-8">You are the Arena Master.</p>
                        <button 
                            onClick={initGame}
                            className="px-8 py-3 bg-white text-black font-bold rounded-lg flex items-center gap-2 hover:bg-gray-200 transition-colors"
                        >
                            <RefreshCw size={18}/> REMATCH
                        </button>
                    </div>
                )}
            </div>

            {/* Retro Scoreboard */}
            <div className="w-full max-w-[800px] grid grid-cols-2 md:grid-cols-4 gap-4">
                {playersRef.current.map(p => (
                    <div key={p.id} className={`p-4 rounded-xl border-2 flex flex-col items-center justify-between transition-all ${p.lives > 0 ? 'bg-gray-900 border-gray-700' : 'bg-red-900/10 border-red-900 opacity-40'}`}>
                        <div className="flex items-center gap-2 mb-2">
                             <span className="text-xl">{p.avatar}</span>
                             <span className="text-[8px] text-gray-500 uppercase font-black truncate max-w-[60px]">{p.name}</span>
                        </div>
                        <div className="flex gap-1 mb-2">
                            {[...Array(3)].map((_, i) => (
                                <Heart key={i} size={12} className={i < p.lives ? 'text-red-500 fill-red-500' : 'text-gray-950'} />
                            ))}
                        </div>
                        <div className="text-xs font-black text-blue-500 font-mono">
                            PTS: {p.score.toString().padStart(4, '0')}
                        </div>
                        {p.stunned > 0 && <div className="text-[8px] text-yellow-500 animate-pulse mt-1">STUNNED!</div>}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-2 text-[8px] text-gray-700 uppercase tracking-[0.4em] font-black">
                <Info size={12}/> Classical Arcade Engine 1.0 // Wrap Active
            </div>
        </div>
    );
};

export default BrawlerGame;
