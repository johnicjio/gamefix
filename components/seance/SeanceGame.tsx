
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { GameProps, SeancePlayer, SeanceState } from '../../types';
import { generateSpiritRiddle } from '../../services/geminiService';
import { audioService } from '../../services/audioService';
import { Eye, Users, RefreshCw, CheckCircle2, HelpCircle, Fingerprint, Move } from 'lucide-react';

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const YES_POS = { x: 100, y: 100 };
const NO_POS = { x: BASE_WIDTH - 100, y: 100 };
const SELECTION_TIME = 120; // Frames to select a letter (~2s)

const SeanceGame: React.FC<GameProps> = ({ network, playerName, onGameEnd }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const planchetteRef = useRef<PIXI.Graphics | null>(null);
    const letterObjectsRef = useRef<Map<string, PIXI.Text>>(new Map());
    const selectionRingRef = useRef<PIXI.Graphics | null>(null);
    const cursorContainerRef = useRef<PIXI.Container | null>(null);
    const connectionLinesRef = useRef<PIXI.Graphics | null>(null);

    // Responsive Scale State
    const [scale, setScale] = useState(1);

    // Mutable state for the game loop
    const gameLogicRef = useRef({
        players: [] as SeancePlayer[],
        planchette: { x: BASE_WIDTH / 2, y: BASE_HEIGHT / 2, angle: 0 },
        velocity: { x: 0, y: 0 },
        hoverTarget: null as string | null,
        hoverTimer: 0,
        selectedLetters: [] as string[],
        currentRiddle: null as { question: string; answer: string } | null,
        phase: 'LOBBY' as 'LOBBY' | 'PLAYING' | 'VICTORY',
        letterPositions: [] as { char: string, x: number, y: number }[]
    });

    const [uiState, setUiState] = useState({
        phase: 'LOBBY',
        riddle: null as { question: string; answer: string } | null,
        selectedLetters: [] as string[],
        players: [] as SeancePlayer[]
    });

    // Local cursor normalized 0-1
    const [myCursor, setMyCursor] = useState({ x: 0.5, y: 0.5 });
    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const myId = network?.myId || 'HOST';

    // --- 0. Responsive Scaling ---
    useEffect(() => {
        const handleResize = () => {
            const availW = window.innerWidth;
            const availH = window.innerHeight;
            // Scale to fit, keeping aspect ratio, with margin
            const scaleX = availW / BASE_WIDTH;
            const scaleY = availH / BASE_HEIGHT;
            const s = Math.min(scaleX, scaleY) * 0.90; // 90% to ensure padding
            setScale(s);
        };
        
        window.addEventListener('resize', handleResize);
        handleResize();
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const syncUi = useCallback(() => {
        const gl = gameLogicRef.current;
        setUiState({
            phase: gl.phase,
            riddle: gl.currentRiddle,
            selectedLetters: [...gl.selectedLetters],
            players: [...gl.players]
        });
    }, []);

    // --- 1. Initialize PixiJS (v7 Syntax) ---
    useEffect(() => {
        if (!containerRef.current) return;

        // Cleanup previous instance
        if (appRef.current) {
            appRef.current.destroy(true, { children: true });
        }

        // v7 Initialization: Use constructor options instead of .init()
        // Note: If using v8, this constructor might need adjustment, but sticking to v7 pattern for now.
        const app = new PIXI.Application({
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            backgroundColor: 0x0a0a0a,
            antialias: true,
            resolution: window.devicePixelRatio || 1,
            autoDensity: true,
        });

        // v7 View Access
        containerRef.current.appendChild(app.view as HTMLCanvasElement);
        appRef.current = app;

        const boardContainer = new PIXI.Container();
        app.stage.addChild(boardContainer);

        // Visuals: Wood Grain
        const bg = new PIXI.Graphics();
        bg.beginFill(0x1a120b);
        bg.drawRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        bg.endFill();
        
        // Add lighter noise
        for(let i=0; i<1000; i++) {
            bg.beginFill(0x2a1d12, 0.3);
            bg.drawRect(Math.random()*BASE_WIDTH, Math.random()*BASE_HEIGHT, 3, 3);
            bg.endFill();
        }
        boardContainer.addChild(bg);
        
        // Pentagram / Decor
        const decor = new PIXI.Graphics();
        decor.lineStyle(2, 0x332211, 0.3);
        decor.drawCircle(BASE_WIDTH/2, BASE_HEIGHT/2, 150);
        
        // Pentagram lines
        for(let i=0; i<5; i++) {
            const angle = (i * 72 - 90) * Math.PI / 180;
            const nextAngle = ((i + 2) * 72 - 90) * Math.PI / 180;
            decor.moveTo(BASE_WIDTH/2 + Math.cos(angle)*150, BASE_HEIGHT/2 + Math.sin(angle)*150);
            decor.lineTo(BASE_WIDTH/2 + Math.cos(nextAngle)*150, BASE_HEIGHT/2 + Math.sin(nextAngle)*150);
        }
        boardContainer.addChild(decor);

        // Letters
        const letters: { char: string, x: number, y: number }[] = [];
        const createText = (char: string, x: number, y: number, size: number = 28) => {
            // v7 TextStyle flat properties
            const style = new PIXI.TextStyle({
                fontFamily: 'serif',
                fontSize: size,
                fill: 0x887766,
                fontWeight: 'bold',
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowBlur: 4,
                dropShadowDistance: 2,
            } as any); // Cast to any to avoid strict type issues with dropShadowColor in some versions
            const text = new PIXI.Text(char, style);
            text.anchor.set(0.5);
            text.x = x;
            text.y = y;
            boardContainer.addChild(text);
            letterObjectsRef.current.set(char, text);
            letters.push({ char, x, y });
        };

        const arcRadius = 240;
        const startAngle = Math.PI - 0.3;
        const endAngle = 2 * Math.PI + 0.3;
        
        for (let i = 0; i < LETTERS.length; i++) {
            const t = i / (LETTERS.length - 1);
            const angle = startAngle + t * (endAngle - startAngle);
            const x = BASE_WIDTH/2 + Math.cos(angle) * arcRadius;
            const y = BASE_HEIGHT/2 + 80 + Math.sin(angle) * arcRadius;
            createText(LETTERS[i], x, y);
        }
        
        createText('YES', YES_POS.x, YES_POS.y, 42);
        createText('NO', NO_POS.x, NO_POS.y, 42);

        gameLogicRef.current.letterPositions = letters;

        // Visuals: Spirit Threads
        const lines = new PIXI.Graphics();
        app.stage.addChild(lines);
        connectionLinesRef.current = lines;

        // Planchette
        const pGroup = new PIXI.Container();
        const body = new PIXI.Graphics();
        
        // Shadow
        body.beginFill(0x000000, 0.4);
        body.drawCircle(5, 5, 55);
        body.endFill();
        
        // Main Body with Hole (v7)
        body.lineStyle(4, 0x5c4033, 1);
        body.beginFill(0x3e2723);
        body.moveTo(0, -65);
        body.quadraticCurveTo(55, -25, 50, 60);
        body.quadraticCurveTo(0, 75, -50, 60);
        body.quadraticCurveTo(-55, -25, 0, -65);
        
        // Hole
        // Cast to any to support versions where beginHole definition is missing or strict
        (body as any).beginHole();
        body.drawCircle(0, 0, 22);
        (body as any).endHole();
        
        body.endFill();
        
        pGroup.addChild(body);
        
        const lens = new PIXI.Graphics();
        lens.lineStyle(2, 0x888888, 0.8);
        lens.beginFill(0xaaccff, 0.15);
        lens.drawCircle(0, 0, 22);
        lens.endFill();
        pGroup.addChild(lens);

        pGroup.x = BASE_WIDTH / 2;
        pGroup.y = BASE_HEIGHT / 2;
        app.stage.addChild(pGroup);
        planchetteRef.current = pGroup as any;

        const ring = new PIXI.Graphics();
        pGroup.addChild(ring);
        selectionRingRef.current = ring;

        // Visuals: Spirit Orbs
        const cursors = new PIXI.Container();
        app.stage.addChild(cursors);
        cursorContainerRef.current = cursors;
        
        // Start Ticker (v7 passes delta as scalar)
        app.ticker.add(ticker);

        return () => {
            if (appRef.current) {
                appRef.current.destroy(true, { children: true });
                appRef.current = null;
            }
        };
    }, []);

    const ticker = (tickerOrDelta: any) => {
        // v8 passes Ticker object, v7 passes delta number.
        // We handle both to prevent type errors and runtime crashes.
        const delta = typeof tickerOrDelta === 'number' ? tickerOrDelta : tickerOrDelta.deltaTime;
        
        const gl = gameLogicRef.current;
        const p = planchetteRef.current;
        const ring = selectionRingRef.current;
        const cursorLayer = cursorContainerRef.current;
        const linesLayer = connectionLinesRef.current;

        if (!p || !ring || !cursorLayer || !linesLayer) return;

        // --- Draw Spirit Orbs & Threads ---
        cursorLayer.removeChildren();
        linesLayer.clear();

        // Draw a "Centroid" target to show players where the collective is pulling
        let tx = 0, ty = 0, count = 0;

        gl.players.forEach((player, i) => {
            if (!player.isActive) return;
            
            const hue = (parseInt(player.id.slice(-4), 16) || i * 50) % 360;
            // v7 Color Utils
            // PIXI.utils.string2hex is deprecated in v8. Using PIXI.Color.
            const color = parseInt(player.id) === parseInt(myId) 
                ? 0x00ff00 
                : new PIXI.Color(`hsl(${hue}, 70%, 50%)`).toNumber();

            const cx = player.cursorX * BASE_WIDTH;
            const cy = player.cursorY * BASE_HEIGHT;

            tx += cx;
            ty += cy;
            count++;

            // Draw Orb
            const orb = new PIXI.Graphics();
            orb.lineStyle(1, 0xffffff, 0.8);
            orb.beginFill(color, 0.6);
            orb.drawCircle(0,0, 8);
            orb.endFill();
            orb.x = cx;
            orb.y = cy;
            
            // Name Tag
            const tag = new PIXI.Text(player.name.substring(0, 8), new PIXI.TextStyle({ 
                fontSize: 12, 
                fill: 0xffffff,
                fontWeight: 'bold',
                stroke: 0x000000,
                strokeThickness: 2
            } as any));
            tag.anchor.set(0.5, 1.8);
            orb.addChild(tag);
            
            cursorLayer.addChild(orb);

            // Draw Thread
            linesLayer.lineStyle(2, color, 0.3);
            linesLayer.moveTo(cx, cy);
            linesLayer.lineTo(p.x, p.y);
        });

        // Draw Ghost Target (The average pull point)
        if (count > 0 && gl.phase === 'PLAYING') {
            const avgX = tx / count;
            const avgY = ty / count;
            
            linesLayer.lineStyle(1, 0xffffff, 0.2);
            linesLayer.drawCircle(avgX, avgY, 15);
            linesLayer.moveTo(avgX - 5, avgY); linesLayer.lineTo(avgX + 5, avgY);
            linesLayer.moveTo(avgX, avgY - 5); linesLayer.lineTo(avgX, avgY + 5);
        }

        // --- Movement Logic ---
        if (isHost && gl.phase === 'PLAYING') {
            if (count > 0) {
                const targetX = tx / count;
                const targetY = ty / count;

                const dx = targetX - p.x;
                const dy = targetY - p.y;
                
                // Spring physics
                gl.velocity.x += dx * 0.008 * delta;
                gl.velocity.y += dy * 0.008 * delta;
                gl.velocity.x *= 0.90; // Dampening
                gl.velocity.y *= 0.90;
                
                p.x += gl.velocity.x * delta;
                p.y += gl.velocity.y * delta;
            }

            // Bounds
            p.x = Math.max(40, Math.min(BASE_WIDTH - 40, p.x));
            p.y = Math.max(40, Math.min(BASE_HEIGHT - 40, p.y));

            // Rotation based on movement
            if (Math.abs(gl.velocity.x) > 0.1 || Math.abs(gl.velocity.y) > 0.1) {
                const targetAngle = Math.atan2(gl.velocity.y, gl.velocity.x) + Math.PI/2;
                let diff = targetAngle - p.rotation;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                p.rotation += diff * 0.05 * delta;
            }

            gl.planchette.x = p.x;
            gl.planchette.y = p.y;
            gl.planchette.angle = p.rotation;
        } else if (!isHost) {
            // Client lerp
            p.x += (gl.planchette.x - p.x) * 0.25 * delta;
            p.y += (gl.planchette.y - p.y) * 0.25 * delta;
            p.rotation += (gl.planchette.angle - p.rotation) * 0.25 * delta;
        }

        // --- Hit Detection ---
        if (isHost && gl.phase === 'PLAYING' && gl.currentRiddle) {
            let closest = null;
            let minDist = 35; // Selection radius

            for (const l of gl.letterPositions) {
                const dx = p.x - l.x;
                const dy = p.y - l.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < minDist) {
                    closest = l.char;
                    break;
                }
            }

            if (closest) {
                if (gl.hoverTarget === closest) gl.hoverTimer += delta;
                else { gl.hoverTarget = closest; gl.hoverTimer = 0; }
            } else {
                gl.hoverTarget = null; gl.hoverTimer = 0;
            }

            if (gl.hoverTimer >= SELECTION_TIME) {
                handleSelection(gl.hoverTarget!);
                gl.hoverTimer = 0;
                gl.hoverTarget = null;
            }
        }

        // --- Letter Highlights ---
        letterObjectsRef.current.forEach((textObj, char) => {
            const isHovered = gl.hoverTarget === char;
            const isSelected = gl.selectedLetters.includes(char);
            if (isSelected) {
                textObj.style.fill = 0x00ff00; textObj.alpha = 1; textObj.scale.set(1.1);
            } else if (isHovered) {
                textObj.style.fill = 0xffcc00; textObj.scale.set(1.3); textObj.alpha = 1;
            } else {
                textObj.style.fill = 0x887766; textObj.scale.set(1); textObj.alpha = 0.5;
            }
        });

        // --- Ring Progress ---
        ring.clear();
        if (gl.hoverTarget && gl.hoverTimer > 0) {
            const progress = Math.min(gl.hoverTimer / SELECTION_TIME, 1);
            ring.lineStyle(6, 0xffcc00, 0.8);
            ring.arc(0, 0, 30, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * progress));
        }
    };

    // --- Logic ---
    const handleSelection = (char: string) => {
        const gl = gameLogicRef.current;
        if (!gl.currentRiddle) return;

        const targetWord = gl.currentRiddle.answer.toUpperCase();
        const currentIndex = gl.selectedLetters.length;

        if (targetWord[currentIndex] === char) {
            gl.selectedLetters.push(char);
            audioService.playChime();
            if (gl.selectedLetters.join('') === targetWord) {
                gl.phase = 'VICTORY';
                audioService.playCelebration();
                if (onGameEnd && isHost) onGameEnd(playerName);
            }
        } else {
            audioService.playFailure();
            gl.hoverTarget = null; gl.hoverTimer = 0;
        }
        syncUi();
        if (isHost && network) broadcastState();
    };

    const broadcastState = () => {
        if (!network) return;
        network.sendAction({
            action: 'SYNC_GAME',
            state: {
                planchette: gameLogicRef.current.planchette,
                hoverTarget: gameLogicRef.current.hoverTarget,
                hoverTimer: gameLogicRef.current.hoverTimer,
                selectedLetters: gameLogicRef.current.selectedLetters,
                phase: gameLogicRef.current.phase,
                riddle: gameLogicRef.current.currentRiddle
            }
        });
    };

    useEffect(() => {
        if (isHost && network) {
            const interval = setInterval(broadcastState, 50);
            return () => clearInterval(interval);
        }
    }, [isHost, network]);

    // --- Input Handling ---
    const handlePointerMove = (e: React.PointerEvent) => {
        e.preventDefault();
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            
            setMyCursor({ x, y });

            if (isHost) {
                const gl = gameLogicRef.current;
                const idx = gl.players.findIndex(p => p.id === myId);
                if (idx !== -1) {
                    gl.players[idx].cursorX = x; gl.players[idx].cursorY = y;
                } else {
                    gl.players.push({ id: myId, name: playerName, color: '#fff', cursorX: x, cursorY: y, isActive: true });
                }
            } else if (network) {
                network.sendAction({ action: 'CURSOR_MOVE', x, y });
            }
        }
    };

    // Network msg handling
    useEffect(() => {
        if (network) {
            network.registerActionHandler((payload, senderId) => {
                const gl = gameLogicRef.current;
                if (isHost) {
                    if (payload.action === 'CURSOR_MOVE') {
                        const idx = gl.players.findIndex(p => p.id === senderId);
                        if (idx !== -1) {
                            gl.players[idx].cursorX = payload.x; gl.players[idx].cursorY = payload.y;
                        } else {
                            gl.players.push({ id: senderId, name: `Spirit ${gl.players.length+1}`, color: '#fff', cursorX: payload.x, cursorY: payload.y, isActive: true });
                        }
                    } else if (payload.action === 'JOIN') { broadcastState(); }
                } else {
                    if (payload.action === 'SYNC_GAME') {
                        const s = payload.state;
                        gl.planchette = s.planchette;
                        gl.hoverTarget = s.hoverTarget;
                        gl.hoverTimer = s.hoverTimer;
                        gl.selectedLetters = s.selectedLetters;
                        gl.phase = s.phase;
                        gl.currentRiddle = s.riddle;
                        syncUi();
                    }
                }
            });
            if (!isHost) network.sendAction({ action: 'JOIN' });
        }
    }, [isHost, network]);

    const startGame = async () => {
        const gl = gameLogicRef.current;
        gl.phase = 'PLAYING';
        gl.selectedLetters = [];
        try {
            const riddle = await generateSpiritRiddle();
            gl.currentRiddle = riddle;
        } catch (e) {
            gl.currentRiddle = { question: "I have keys but no locks. What am I?", answer: "PIANO" };
        }
        syncUi();
        broadcastState();
        audioService.playChime();
    };

    return (
        <div className="flex flex-col items-center justify-center w-full h-screen bg-black text-gray-300 font-serif overflow-hidden relative select-none touch-none fixed inset-0 z-10">
            
            {/* Lobby UI */}
            {uiState.phase === 'LOBBY' && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="text-center p-8 border border-gray-800 rounded-2xl bg-gray-900 shadow-2xl max-w-md w-full animate-in fade-in zoom-in">
                        <Eye size={64} className="mx-auto mb-6 text-purple-600 animate-pulse" />
                        <h1 className="text-4xl mb-2 text-white font-bold tracking-widest uppercase">The Séance</h1>
                        
                        <div className="bg-purple-900/20 p-4 rounded-lg border border-purple-500/20 mb-6 text-sm text-left">
                            <h3 className="flex items-center gap-2 font-bold text-purple-300 mb-2"><HelpCircle size={14}/> Co-op Rules</h3>
                            <ul className="list-disc list-inside space-y-1 text-gray-400">
                                <li>The planchette is pulled by <strong>ALL</strong> players.</li>
                                <li>Drag your finger/mouse to pull it towards a letter.</li>
                                <li><strong>Hold steady</strong> over a letter to select it.</li>
                            </ul>
                        </div>

                        <div className="flex flex-wrap justify-center gap-3 mb-8">
                            {uiState.players.map(p => (
                                <div key={p.id} className="flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full text-sm animate-pulse border border-purple-500/30">
                                    <Users size={14} className="text-purple-400" /> {p.name || 'Spirit'}
                                </div>
                            ))}
                            {uiState.players.length === 0 && <span className="text-gray-600 italic">Summoning spirits...</span>}
                        </div>

                        {isHost ? (
                            <button onClick={startGame} className="w-full bg-gradient-to-r from-purple-900 to-indigo-900 border border-purple-500 text-white px-8 py-4 rounded-xl hover:from-purple-800 hover:to-indigo-800 transition-all font-bold tracking-widest shadow-[0_0_20px_rgba(147,51,234,0.3)]">
                                BEGIN RITUAL
                            </button>
                        ) : (
                            <div className="flex items-center justify-center gap-2 text-purple-400 animate-pulse">
                                <RefreshCw className="animate-spin" size={16}/> Waiting for Medium...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* In-Game Riddle UI */}
            {uiState.phase === 'PLAYING' && uiState.riddle && (
                <div className="absolute top-16 md:top-8 z-10 w-full max-w-2xl px-4 pointer-events-none">
                    <div className="bg-gray-900/90 backdrop-blur-md p-4 md:p-6 rounded-2xl border border-purple-500/30 text-center shadow-2xl animate-in slide-in-from-top-4">
                        <p className="text-lg md:text-2xl text-white font-serif italic mb-4 drop-shadow-md">"{uiState.riddle.question}"</p>
                        <div className="flex justify-center gap-2 flex-wrap">
                            {Array.from({ length: uiState.riddle.answer.length }).map((_, i) => {
                                const letter = uiState.selectedLetters[i];
                                return (
                                    <div key={i} className={`w-10 h-12 md:w-12 md:h-16 border-b-4 flex items-center justify-center text-2xl md:text-3xl font-bold font-serif transition-all
                                        ${letter ? 'border-green-500 text-green-400 bg-green-900/20' : 'border-gray-700 text-gray-600'}
                                    `}>
                                        {letter || '?'}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Victory UI */}
            {uiState.phase === 'VICTORY' && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-1000">
                    <div className="text-center p-4">
                        <CheckCircle2 size={80} className="mx-auto mb-4 text-green-500 animate-bounce" />
                        <h1 className="text-4xl md:text-6xl font-black text-white mb-4">SPIRIT APPEASED</h1>
                        <p className="text-xl md:text-2xl text-green-400 font-serif mb-8">The answer was "{uiState.riddle?.answer}"</p>
                        {isHost && (
                            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform">
                                Return to Void
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Game Container using Centered Absolute Positioning for Perfect Fit */}
            <div 
                ref={containerRef} 
                onPointerMove={handlePointerMove}
                onPointerDown={handlePointerMove}
                className="absolute left-1/2 top-1/2 shadow-[0_0_150px_rgba(88,28,135,0.2)] rounded-3xl overflow-hidden border-4 border-gray-800 bg-gray-900"
                style={{ 
                    width: BASE_WIDTH, 
                    height: BASE_HEIGHT,
                    transform: `translate(-50%, -50%) scale(${scale})`,
                    transformOrigin: 'center center',
                    touchAction: 'none'
                }}
            />
            
            <div className="absolute bottom-4 left-0 w-full text-center text-gray-500 text-xs font-mono uppercase tracking-widest opacity-70 flex justify-center items-center gap-2 pointer-events-none">
                <Move size={12}/> Drag to Guide Together
            </div>
        </div>
    );
};

export default SeanceGame;
