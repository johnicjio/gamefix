
import { QuizChallenge, ImageSize } from "../types";

const FALLBACK_RIDDLES = [
    { 
        question: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
        answer: "Echo",
        options: ["Echo", "Ghost", "Cloud", "Shadow"]
    },
    {
        question: "The more of this there is, the less you see. What is it?",
        answer: "Darkness",
        options: ["Darkness", "Fog", "Light", "Distance"]
    },
    {
        question: "I have keys but no locks. I have a space but no room. You can enter, but never go outside. What am I?",
        answer: "Keyboard",
        options: ["Keyboard", "Piano", "Map", "House"]
    }
];

export const generateRescueRiddle = async (victimName: string, rescuerName: string): Promise<Omit<QuizChallenge, 'forPlayerId' | 'victimId'>> => {
    // Return random fallback since AI is disabled
    const r = FALLBACK_RIDDLES[Math.floor(Math.random() * FALLBACK_RIDDLES.length)];
    return r;
};

export const generateGameImage = async (prompt: string, size: ImageSize): Promise<string | null> => {
  return null;
};

export const validateNPATAnswers = async (letter: string, answers: { name: string, place: string, animal: string, thing: string }): Promise<Record<string, boolean>> => {
    // Mock validation - always true for fun in offline/no-key mode
    return { name: true, place: true, animal: true, thing: true };
};

export const validateWord = async (word: string, letter: string, minLength: number): Promise<{ isValid: boolean; reason?: string }> => {
    const cleanWord = word.trim();
    const cleanLetter = letter.toUpperCase();

    if (!cleanWord.toUpperCase().startsWith(cleanLetter)) {
        return { isValid: false, reason: `Must start with '${cleanLetter}'` };
    }

    if (cleanWord.length < minLength) {
        return { isValid: false, reason: `Min length is ${minLength}` };
    }

    try {
        const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
        
        if (response.status === 404) {
            return { isValid: false, reason: "Not in Dictionary" };
        }

        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                return { isValid: true };
            }
        }
        
        return { isValid: false, reason: "Invalid Word" };
    } catch (e) {
        console.error("Dictionary API Error", e);
        // Fallback: allow logic if API is down to prevent game locking
        return { isValid: true }; 
    }
};

export const generateCarromCommentary = async (playerName: string, event: 'FOUL' | 'QUEEN' | 'WIN' | 'MISS' | 'SHOT'): Promise<string> => {
  const comments = ["Nice shot!", "Ouch!", "Amazing!", "What a play!", "So close!"];
  return comments[Math.floor(Math.random() * comments.length)];
};

export const generateSpiritRiddle = async (): Promise<{ question: string; answer: string }> => {
    return { question: "I provide light but have no flame. What am I?", answer: "LAMP" };
};
