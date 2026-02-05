
import { LudoColor, Piece } from "../../types";

// Ludo Grid is 15x15.
// 0,0 is Top-Left.

export const SAFE_SPOTS = [
  8, 21, 34, 47, // Star spots on path
  0, 13, 26, 39  // Start spots
];

// Mapping relative path index (0-56) to x,y coordinates on the 15x15 grid
const BASE_PATH_COORDS: {x: number, y: number}[] = [
    // Green Path Start (Index 0 is start point at x:1, y:6)
    {x:1, y:6}, {x:2, y:6}, {x:3, y:6}, {x:4, y:6}, {x:5, y:6},
    {x:6, y:5}, {x:6, y:4}, {x:6, y:3}, {x:6, y:2}, {x:6, y:1}, {x:6, y:0},
    {x:7, y:0}, {x:8, y:0},
    {x:8, y:1}, {x:8, y:2}, {x:8, y:3}, {x:8, y:4}, {x:8, y:5},
    {x:9, y:6}, {x:10, y:6}, {x:11, y:6}, {x:12, y:6}, {x:13, y:6}, {x:14, y:6},
    {x:14, y:7}, {x:14, y:8},
    {x:13, y:8}, {x:12, y:8}, {x:11, y:8}, {x:10, y:8}, {x:9, y:8},
    {x:8, y:9}, {x:8, y:10}, {x:8, y:11}, {x:8, y:12}, {x:8, y:13}, {x:8, y:14},
    {x:7, y:14}, {x:6, y:14},
    {x:6, y:13}, {x:6, y:12}, {x:6, y:11}, {x:6, y:10}, {x:6, y:9},
    {x:5, y:8}, {x:4, y:8}, {x:3, y:8}, {x:2, y:8}, {x:1, y:8}, {x:0, y:8},
    {x:0, y:7} // 51 is last common square
];

// Home Stretch Coordinates
const HOME_STRETCH: Record<LudoColor, {x: number, y: number}[]> = {
    [LudoColor.GREEN]:  [{x:1, y:7}, {x:2, y:7}, {x:3, y:7}, {x:4, y:7}, {x:5, y:7}, {x:6, y:7}],
    [LudoColor.YELLOW]: [{x:7, y:1}, {x:7, y:2}, {x:7, y:3}, {x:7, y:4}, {x:7, y:5}, {x:7, y:6}],
    [LudoColor.BLUE]:   [{x:13, y:7}, {x:12, y:7}, {x:11, y:7}, {x:10, y:7}, {x:9, y:7}, {x:8, y:7}],
    [LudoColor.RED]:    [{x:7, y:13}, {x:7, y:12}, {x:7, y:11}, {x:7, y:10}, {x:7, y:9}, {x:7, y:8}],
};

// Base Positions (Where pieces sit before starting)
const BASE_POSITIONS: Record<LudoColor, {x: number, y: number}[]> = {
    [LudoColor.GREEN]:  [{x:2, y:2}, {x:3, y:2}, {x:2, y:3}, {x:3, y:3}],
    [LudoColor.YELLOW]: [{x:11, y:2}, {x:12, y:2}, {x:11, y:3}, {x:12, y:3}],
    [LudoColor.BLUE]:   [{x:11, y:11}, {x:12, y:11}, {x:11, y:12}, {x:12, y:12}],
    [LudoColor.RED]:    [{x:2, y:11}, {x:3, y:11}, {x:2, y:12}, {x:3, y:12}],
};

// Starting offsets in the generic path for each color
export const START_OFFSETS: Record<LudoColor, number> = {
    [LudoColor.GREEN]: 0,
    [LudoColor.YELLOW]: 13,
    [LudoColor.BLUE]: 26,
    [LudoColor.RED]: 39,
};

export const getPieceCoordinates = (color: LudoColor, position: number, pieceIndex: number) => {
    // 1. In Base
    if (position === -1) {
        return BASE_POSITIONS[color][pieceIndex];
    }

    // 2. Victory (Center)
    if (position === 57) {
        const center = { x: 7, y: 7 };
        return center;
    }

    // 3. Home Stretch (51-56)
    if (position >= 51) {
        const index = position - 51;
        if (index < 6) {
             return HOME_STRETCH[color][index];
        }
        return {x:7, y:7};
    }

    // 4. Main Path
    const offset = START_OFFSETS[color];
    const globalIndex = (offset + position) % 52;
    return BASE_PATH_COORDS[globalIndex];
};

export const canMove = (piece: Piece, diceValue: number): boolean => {
    if (piece.position === -1) return diceValue === 6;
    return (piece.position + diceValue) <= 57;
};

/**
 * UTILITY: Converts a player's relative position (0-50) to the board's global index (0-51).
 * Returns -1 if the piece is in Base (-1) or Home Stretch (>50), as those areas are safe/private.
 */
const getGlobalPos = (color: LudoColor, pos: number) => {
    if (pos < 0 || pos > 50) return -1;
    return (START_OFFSETS[color] + pos) % 52;
};

const getDistance = (from: number, to: number) => {
    let d = to - from;
    if (d <= 0) d += 52;
    return d;
};

/**
 * AI LOGIC: Returns true if a specific Global Position is currently under threat by any opponent.
 * A threat exists if an opponent is 1-6 steps behind the target position.
 */
const getThreatLevel = (targetGlobal: number, myColor: LudoColor, allPieces: Piece[]): number => {
    if (SAFE_SPOTS.includes(targetGlobal)) return 0;

    let threatScore = 0;
    
    allPieces.forEach(p => {
        if (p.color === myColor || p.position > 50) return;
        
        let distance = -1;
        
        // Enemy on board
        if (p.position !== -1) {
            const enemyGlobal = getGlobalPos(p.color, p.position);
            distance = getDistance(enemyGlobal, targetGlobal);
            
            // Immediate kill range (1-6)
            if (distance >= 1 && distance <= 6) {
                threatScore += 50; // High threat
            }
            // Approaching threat (7-12) - Future prediction
            else if (distance > 6 && distance <= 12) {
                threatScore += 10;
            }
        } 
        // Enemy in base (needs 6 + X)
        else {
             // Calculate hypothetical distance from their start
             const enemyStartGlobal = START_OFFSETS[p.color];
             distance = getDistance(enemyStartGlobal, targetGlobal);
             // If they spawn, are we in danger?
             if (distance >= 1 && distance <= 6) {
                 threatScore += 5; // Low threat (requires 6 + roll)
             }
        }
    });
    
    return threatScore;
};

/**
 * ADVANCED AI MOVEMENT
 * Evaluates all possible moves and assigns a score based on strategy.
 */
export const getSmartAIMove = (
    myPieces: Piece[], 
    allPieces: Piece[], 
    diceValue: number, 
    myColor: LudoColor
): { piece: Piece, strategy: string } | null => {
    
    const validMoves = myPieces.filter(p => canMove(p, diceValue));
    if (validMoves.length === 0) return null;

    const scoredMoves = validMoves.map(piece => {
        let score = 0;
        let reasons: string[] = [];
        const currentPos = piece.position;
        const targetPos = currentPos + diceValue;
        
        const currentGlobal = getGlobalPos(myColor, currentPos);
        const targetGlobal = getGlobalPos(myColor, targetPos); // -1 if home stretch or base

        // --- 1. VICTORY (Critical) ---
        if (targetPos === 57) {
            score += 10000;
            reasons.push("VICTORY!");
        }

        // --- 2. KILLING (Aggressive) ---
        // Capturing an opponent is a massive swing.
        if (targetPos <= 50) {
            const victim = allPieces.find(p => 
                p.color !== myColor && 
                p.position !== -1 && 
                p.position <= 50 &&
                !SAFE_SPOTS.includes(getGlobalPos(p.color, p.position)) &&
                getGlobalPos(p.color, p.position) === targetGlobal
            );
            
            if (victim) {
                const bonus = victim.position > 35 ? 2000 : 1000;
                score += 5000 + bonus;
                reasons.push("Attacking enemy!");
            }
        }

        // --- 3. PREDICTIVE SAFETY (Defensive) ---
        const currentThreat = getThreatLevel(currentGlobal, myColor, allPieces);
        const targetThreat = getThreatLevel(targetGlobal, myColor, allPieces);
        
        // A. Escaping Danger
        if (currentPos !== -1 && currentPos <= 50) {
             if (currentThreat > 0 && targetThreat < currentThreat) {
                 score += 4000 + currentThreat; // Prioritize escaping higher threats
                 reasons.push("Fleeing danger!");
             }
        }

        // B. Avoiding Death (Risk Assessment)
        if (targetPos <= 50) {
             if (targetThreat > 20) {
                 score -= 2000; 
                 reasons.push("Too risky.");
             } else if (targetThreat > 0) {
                 score -= 500;
             }
        }

        // C. Securing Safe Spot
        const isTargetSafe = SAFE_SPOTS.includes(targetGlobal) || targetPos > 50;
        if (isTargetSafe && !SAFE_SPOTS.includes(currentGlobal)) {
            score += 2500;
            if (!reasons.length) reasons.push("Taking cover.");
        }

        // D. Leaving Safe Spot (Penalty)
        if (SAFE_SPOTS.includes(currentGlobal) && !isTargetSafe) {
             score -= 1500;
        }

        // --- 4. OPENING (Tempo) ---
        if (currentPos === -1 && diceValue === 6) {
            // Priority based on board presence
            const activePieces = myPieces.filter(p => p.position !== -1 && p.position !== 57).length;
            if (activePieces === 0) {
                score += 3000;
                reasons.push("Deploying!");
            } else if (activePieces < 2) {
                score += 1200;
                if (!reasons.length) reasons.push("Reinforcing.");
            } else {
                score += 200; // Low priority if already have troops
            }
        }

        // --- 5. HUNTING & BLOCKING (Positioning) ---
        // Position 1-6 steps behind opponent (Ambush)
        if (targetPos <= 50) {
            // Check if we are positioning to kill
            const enemiesAhead = allPieces.filter(p => 
                 p.color !== myColor && 
                 p.position !== -1 && 
                 p.position <= 50 && 
                 !SAFE_SPOTS.includes(getGlobalPos(p.color, p.position))
            );
            
            for (const enemy of enemiesAhead) {
                const enemyGlobal = getGlobalPos(enemy.color, enemy.position);
                const dist = getDistance(targetGlobal, enemyGlobal);
                if (dist >= 1 && dist <= 6) {
                    score += 800;
                    if (!reasons.length) reasons.push("Hunting.");
                    break;
                }
            }

            // Blocking: Occupying safe spots that others might want?
            // (Standard Ludo rules don't block movement, but occupying a shared safe spot
            // prevents others from having "exclusive" safety, or just crowding)
            if (SAFE_SPOTS.includes(targetGlobal) && targetGlobal !== 0 && targetGlobal !== 13 && targetGlobal !== 26 && targetGlobal !== 39) {
                // Star spots are valuable
                score += 300;
            }
        }

        // --- 6. PROGRESS ---
        score += (diceValue * 10);
        if (currentPos > 50) score += 600; // Rush home

        // --- 7. STACKING PENALTY ---
        // Avoid landing on self (inefficient distribution) unless it's a safe spot
        if (targetPos <= 50 && !isTargetSafe) {
             const onSelf = myPieces.some(p => p.id !== piece.id && p.position === targetPos);
             if (onSelf) score -= 200;
        }

        // Fallback reason
        if (reasons.length === 0) reasons.push("Advancing.");

        return { piece, score, strategy: reasons[0] };
    });

    // Sort by score descending
    scoredMoves.sort((a, b) => b.score - a.score);
    
    // Pick best
    return { piece: scoredMoves[0].piece, strategy: scoredMoves[0].strategy };
};
