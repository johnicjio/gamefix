
import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as PIXI from 'pixi.js';
import { GameProps, SeancePlayer } from '../../types';
import { generateSpiritRiddle } from '../../services/geminiService';
import { audioService } from '../../services/audioService';
import { Eye, Ghost, RefreshCw, Move, Sparkles } from 'lucide-react';

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SELECTION_TIME = 80;

const SeanceGame: React.FC<GameProps> = ({ network, playerName, onGameEnd }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const planchetteRef = useRef<PIXI.Graphics | null>(null);
    const letterObjectsRef = useRef<Map<string, PIXI.Text>>(new Map());
    const selectionRingRef = useRef<PIXI.Graphics | null>(null);
    const cursorContainerRef = useRef<PIXI.Container | null>(null);
    const trailRef = useRef<PIXI.Graphics | null>(null);

    const [scale, setScale] = useState(1);
    const [uiState, setUiState] = useState({
        phase: 'LOBBY',
        riddle: null as { question: string; answer: string } | null,
        selectedLetters: [] as string[],
        players: [] as SeancePlayer[]
    });

    const gameLogicRef = useRef({
        players: [] as SeancePlayer[],
        planchette: { x: BASE_WIDTH / 2, y: BASE_HEIGHT / 2, angle: 0 },
        velocity: { x: 0, y: 0 },
        hoverTarget: null as string | null,
        hoverTimer: 0,
        selectedLetters: [] as string[],
        currentRiddle: null as { question: string; answer: string } | null,
        phase: 'LOBBY' as 'LOBBY' | 'PLAYING' | 'VICTORY',
        letterPositions: [] as { char: string, x: number, y: number }[],
        trailPoints: [] as {x: number, y: number, alpha: number}[]
    });

    const isHost = !network || network.role === 'HOST' || network.role === 'OFFLINE';
    const myId = network?.myId || 'HOST';

    useEffect(() => {
        const handleResize = () => {
            const s = Math.min(window.innerWidth / BASE_WIDTH, (window.innerHeight - 100) / BASE_HEIGHT) * 0.95;
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

    useEffect(() => {
        if (!containerRef.current) return;
        if (appRef.current) appRef.current.destroy(true, { children: true });

        const app = new PIXI.Application({
            width: BASE_WIDTH, height: BASE_HEIGHT,
            backgroundColor: 0x030303, antialias: true,
            resolution: window.devicePixelRatio || 1, autoDensity: true,
        });
        containerRef.current.appendChild(app.view as HTMLCanvasElement);
        appRef.current = app;

        const board = new PIXI.Container();
        app.stage.addChild(board);

        // Dark Wood Texture
        const bg = new PIXI.Graphics();
        bg.beginFill(0x1a120b);
        bg.drawRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
        bg.endFill();
        // Add "grain"
        for(let i=0; i<1200; i++) {
            bg.beginFill(0x000000, 0.3);
            bg.drawRect(Math.random()*BASE_WIDTH, Math.random()*BASE_HEIGHT, 1, 1);
        }
        board.addChild(bg);

        // Spectral Trail Layer
        const trail = new PIXI.Graphics();
        board.addChild(trail);
        trailRef.current = trail;

        const decor = new PIXI.Graphics();
        decor.lineStyle(3, 0x3d2b1f, 0.4);
        decor.drawCircle(BASE_WIDTH/2, BASE_HEIGHT/2, 180);
        decor.lineStyle(1, 0x3d2b1f, 0.2);
        decor.drawCircle(BASE_WIDTH/2, BASE_HEIGHT/2, 220);
        board.addChild(decor);

        const letters: { char: string, x: number, y: number }[] = [];
        const createText = (char: string, x: number, y: number, size: number = 36) => {
            const style = new PIXI.TextStyle({
                fontFamily: 'serif', fontSize: size, fill: 0x8b7355, fontWeight: 'bold',
                dropShadow: true, dropShadowColor: '#000000', dropShadowBlur: 6,
            } as any);
            const text = new PIXI.Text(char, style);
            text.anchor.set(0.5); text.x = x; text.y = y;
            board.addChild(text);
            letterObjectsRef.current.set(char, text);
            letters.push({ char, x, y });
        };

        const arcRadius = 240;
        const startAngle = Math.PI - 0.5;
        const endAngle = 2 * Math.PI + 0.5;
        for (let i = 0; i < LETTERS.length; i++) {
            const t = i / (LETTERS.length - 1);
            const angle = startAngle + t * (endAngle - startAngle);
            createText(LETTERS[i], BASE_WIDTH/2 + Math.cos(angle)*arcRadius, BASE_HEIGHT/2 + 80 + Math.sin(angle)*arcRadius);
        }
        createText('YES', 160, 180, 52);
        createText('NO', BASE_WIDTH - 160, 180, 52);
        gameLogicRef.current.letterPositions = letters;

        const cursors = new PIXI.Container();
        app.stage.addChild(cursors);
        cursorContainerRef.current = cursors;

        const pGroup = new PIXI.Container();
        const shadow = new PIXI.Graphics();
        shadow.beginFill(0x000000, 0.4);
        shadow.drawCircle(6, 6, 65);
        shadow.endFill();
        pGroup.addChild(shadow);

        const body = new PIXI.Graphics();
        body.lineStyle(4, 0x3e2723, 1);
        body.beginFill(0x2d1b18);
        body.moveTo(0, -80);
        body.quadraticCurveTo(70, -30, 65, 75);
        body.quadraticCurveTo(0, 95, -65, 75);
        body.quadraticCurveTo(-70, -30, 0, -80);
        (body as any).beginHole();
        body.drawCircle(0, 0, 30);
        (body as any).endHole();
        body.endFill();
        pGroup.addChild(body);

        const glass = new PIXI.Graphics();
        glass.lineStyle(2, 0xffffff, 0.3);
        glass.beginFill(0x88ccff, 0.08);
        glass.drawCircle(0, 0, 30);
        glass.endFill();
        pGroup.addChild(glass);

        pGroup.x = BASE_WIDTH / 2; pGroup.y = BASE_HEIGHT / 2;
        app.stage.addChild(pGroup);
        planchetteRef.current = pGroup as any;

        const ring = new PIXI.Graphics();
        pGroup.addChild(ring);
        selectionRingRef.current = ring;

        app.ticker.add((ticker: any) => {
            const delta = ticker.deltaTime;
            const gl = gameLogicRef.current;
            const p = planchetteRef.current;
            const ringG = selectionRingRef.current;
            const trailG = trailRef.current;
            if (!p || !ringG || !trailG) return;

            // Handle Physics (Simplified for Seance)
            let tx = 0, ty = 0, count = 0;
            gl.players.forEach((player) => {
                if (!player.isActive) return;
                tx += player.cursorX * BASE_WIDTH;
                ty += player.cursorY * BASE_HEIGHT;
                count++;
            });

            if (isHost && gl.phase === 'PLAYING' && count > 0) {
                const targetX = tx / count;
                const targetY = ty / count;
                gl.velocity.x += (targetX - p.x) * 0.008 * delta;
                gl.velocity.y += (targetY - p.y) * 0.008 * delta;
                gl.velocity.x *= 0.9; gl.velocity.y *= 0.9;
                p.x += gl.velocity.x * delta;
                p.y += gl.velocity.y * delta;
                p.rotation += (Math.atan2(gl.velocity.y, gl.velocity.x) + Math.PI/2 - p.rotation) * 0.08 * delta;
                gl.planchette = { x: p.x, y: p.y, angle: p.rotation };
            } else if (!isHost) {
                p.x += (gl.planchette.x - p.x) * 0.2 * delta;
                p.y += (gl.planchette.y - p.y) * 0.2 * delta;
                p.rotation += (gl.planchette.angle - p.rotation) * 0.2 * delta;
            }

            // Spectral Trail logic
            if (Math.hypot(gl.velocity.x, gl.velocity.y) > 0.5) {
                gl.trailPoints.unshift({x: p.x, y: p.y, alpha: 0.4});
            }
            if (gl.trailPoints.length > 30) gl.trailPoints.pop();
            
            trailG.clear();
            gl.trailPoints.forEach((pt, i) => {
                pt.alpha *= 0.95;
                trailG.beginFill(0x9333ea, pt.alpha * (1 - i/30));
                trailG.drawCircle(pt.x, pt.y, 25 * (1 - i/30));
            });

            // Letter Collision
            if (isHost && gl.phase === 'PLAYING' && gl.currentRiddle) {
                let closest = null;
                for (const l of gl.letterPositions) {
                    if (Math.hypot(p.x - l.x, p.y - l.y) < 40) { closest = l.char; break; }
                }
                if (closest) {
                    if (gl.hoverTarget === closest) gl.hoverTimer += delta;
                    else { gl.hoverTarget = closest; gl.hoverTimer = 0; }
                } else { gl.hoverTarget = null; gl.hoverTimer = 0; }

                if (gl.hoverTimer >= SELECTION_TIME) {
                    const targetWord = gl.currentRiddle.answer.toUpperCase();
                    if (targetWord[gl.selectedLetters.length] === gl.hoverTarget) {
                        gl.selectedLetters.push(gl.hoverTarget!);
                        audioService.playChime();
                        if (gl.selectedLetters.join('') === targetWord) {
                            gl.phase = 'VICTORY';
                            audioService.playCelebration();
                            if (onGameEnd) onGameEnd(playerName);
                        }
                    } else { audioService.playFailure(); }
                    gl.hoverTarget = null; gl.hoverTimer = 0;
                    syncUi();
                }
            }

            // Visual updates for letters
            letterObjectsRef.current.forEach((textObj, char) => {
                const isHovered = gl.hoverTarget === char;
                const isSelected = gl.selectedLetters.includes(char);
                textObj.style.fill = isSelected ? 0x4ade80 : isHovered ? 0xa855f7 : 0x8b7355;
                textObj.alpha = isSelected || isHovered ? 1.0 : 0.4;
                textObj.scale.set(isHovered ? 1.4 : 1.0);
            });

            ringG.clear();
            if (gl.hoverTarget && gl.hoverTimer > 0) {
                ringG.lineStyle(6, 0xa855f7, 0.8);
                ringG.arc(0, 0, 40, -Math.PI/2, -Math.PI/2 + (Math.PI * 2 * (gl.hoverTimer / SELECTION_TIME)));
            }
        });

        return () => appRef.current?.destroy(true, { children: true });
    }, []);

    const startGame = async () => {
        gameLogicRef.current.phase = 'PLAYING';
        gameLogicRef.current.selectedLetters = [];
        try {
            gameLogicRef.current.currentRiddle = await generateSpiritRiddle();
        } catch (e) {
            gameLogicRef.current.currentRiddle = { question: "I speak without a mouth. What am I?", answer: "ECHO" };
        }
        syncUi();
        audioService.playLevelUp();
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            if (isHost) {
                const idx = gameLogicRef.current.players.findIndex(p => p.id === myId);
                if (idx !== -1) { gameLogicRef.current.players[idx].cursorX = x; gameLogicRef.current.players[idx].cursorY = y; }
                else { gameLogicRef.current.players.push({ id: myId, name: playerName, color: '#fff', cursorX: x, cursorY: y, isActive: true }); }
            } else { network?.sendAction('CURSOR_MOVE', { x, y }); }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[85vh] bg-black text-gray-300 font-serif relative select-none touch-none rounded-[3rem] overflow-hidden border-4 border-gray-900 shadow-[0_0_100px_rgba(147,51,234,0.1)]">
            <style>{`
                .candle-flicker {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at 50% 50%, rgba(255, 160, 0, 0.08) 0%, transparent 70%);
                    animation: flicker 5s infinite alternate ease-in-out;
                    pointer-events: none;
                    z-index: 5;
                }
                @keyframes flicker {
                    0% { opacity: 0.3; transform: scale(1); }
                    25% { opacity: 0.6; transform: scale(1.02) rotate(1deg); }
                    50% { opacity: 0.4; transform: scale(0.98); }
                    75% { opacity: 0.7; transform: scale(1.05) rotate(-1deg); }
                    100% { opacity: 0.3; transform: scale(1); }
                }
                .ouija-overlay {
                    position: absolute;
                    inset: 0;
                    box-shadow: inset 0 0 150px rgba(0,0,0,0.8);
                    pointer-events: none;
                    z-index: 10;
                }
            `}</style>
            
            <div className="candle-flicker" />
            <div className="ouija-overlay" />

            {uiState.phase === 'LOBBY' && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-8">
                    <div className="text-center p-12 border-2 border-purple-500/30 rounded-[3.5rem] bg-gray-950/80 shadow-[0_0_50px_rgba(147,51,234,0.2)] max-w-md w-full animate-in zoom-in">
                        <Eye size={72} className="mx-auto mb-8 text-purple-500 animate-pulse" />
                        <h1 className="text-4xl mb-4 text-white font-bold tracking-[0.2em] uppercase italic drop-shadow-lg">The Séance</h1>
                        <p className="text-purple-400/60 text-[10px] mb-12 leading-relaxed uppercase tracking-[0.4em] font-black">Spiritual Synchronization Protocol</p>
                        {isHost ? (
                            <button onClick={startGame} className="w-full bg-purple-600 text-white px-8 py-5 rounded-2xl font-black text-xl hover:bg-purple-500 transition-all shadow-[0_0_30px_rgba(147,51,234,0.4)] hover:scale-105 active:scale-95">
                                INVOKE SPIRIT
                            </button>
                        ) : (
                            <div className="flex flex-col items-center gap-4 text-purple-400 font-bold uppercase tracking-widest text-[10px]">
                                <RefreshCw className="animate-spin" size={24}/> Connection Pending...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {uiState.phase === 'PLAYING' && uiState.riddle && (
                <div className="absolute top-10 z-20 w-full max-w-2xl px-6 pointer-events-none">
                    <div className="bg-gray-950/95 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-purple-500/20 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
                        <p className="text-2xl text-purple-100 font-serif italic mb-8 drop-shadow-md leading-relaxed font-bold">"{uiState.riddle.question}"</p>
                        <div className="flex justify-center gap-4">
                            {uiState.riddle.answer.split('').map((char, i) => (
                                <div key={i} className={`w-14 h-16 border-b-4 flex items-center justify-center text-4xl font-black font-serif transition-all duration-500
                                    ${uiState.selectedLetters[i] ? 'border-green-500 text-green-400 scale-110' : 'border-gray-800 text-gray-800'}
                                `}>
                                    {uiState.selectedLetters[i] || '?'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div 
                ref={containerRef} 
                onPointerMove={handlePointerMove}
                className="rounded-[3rem] overflow-hidden border-2 border-gray-900"
                style={{ width: BASE_WIDTH, height: BASE_HEIGHT, transform: `scale(${scale})` }}
            />
            
            <div className="absolute bottom-8 flex items-center gap-3 text-[10px] text-gray-700 font-black uppercase tracking-[0.5em] opacity-60 z-20">
                <Move size={14}/> Collaborative Guidance <Ghost size={14} className="animate-pulse"/>
            </div>
        </div>
    );
};

export default SeanceGame;
