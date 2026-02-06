
// Use @google/genai as requested
import { GoogleGenAI, Type } from "@google/genai";
import { QuizChallenge, ImageSize } from "../types";

// Always use process.env.API_KEY directly in call contexts to ensure freshness
// Refactoring to local instantiation within functions per guidelines

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

// Generate content using gemini-3-flash-preview for text tasks
export const generateRescueRiddle = async (victimName: string, rescuerName: string): Promise<Omit<QuizChallenge, 'forPlayerId' | 'victimId'>> => {
    try {
        // Instantiate fresh for each call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a challenging riddle to rescue ${victimName}, being helped by ${rescuerName}. The answer should be a single word.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        answer: { type: Type.STRING },
                        options: { 
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["question", "answer", "options"]
                }
            }
        });
        const data = JSON.parse(response.text || '{}');
        return data;
    } catch (e) {
        console.error("Gemini Error", e);
        return FALLBACK_RIDDLES[Math.floor(Math.random() * FALLBACK_RIDDLES.length)];
    }
};

// Generate high-quality images using gemini-3-pro-image-preview
export const generateGameImage = async (prompt: string, size: ImageSize): Promise<string | null> => {
    try {
        // Instantiate fresh for each call - critical for user-selected keys
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-image-preview',
            contents: { parts: [{ text: prompt }] },
            config: {
                imageConfig: {
                    aspectRatio: "1:1",
                    imageSize: size
                }
            }
        });
        // Find the image part in candidates manually as per guidelines
        const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part?.inlineData) {
            return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
    } catch (e) {
        console.error("Gemini Image Error", e);
        return null;
    }
};

// Use structured JSON output for answer validation
export const validateNPATAnswers = async (letter: string, answers: { name: string, place: string, animal: string, thing: string }): Promise<Record<string, boolean>> => {
    try {
        // Instantiate fresh for each call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Validate these NPAT (Name, Place, Animal, Thing) answers for the letter '${letter}': ${JSON.stringify(answers)}. Return a boolean for each.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.BOOLEAN },
                        place: { type: Type.BOOLEAN },
                        animal: { type: Type.BOOLEAN },
                        thing: { type: Type.BOOLEAN }
                    },
                    required: ["name", "place", "animal", "thing"]
                }
            }
        });
        return JSON.parse(response.text || '{"name":false,"place":false,"animal":false,"thing":false}');
    } catch (e) {
        console.error("Gemini Validation Error", e);
        return { name: true, place: true, animal: true, thing: true };
    }
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

// Prompt for text commentary using gemini-3-flash-preview
export const generateCarromCommentary = async (playerName: string, event: 'FOUL' | 'QUEEN' | 'WIN' | 'MISS' | 'SHOT'): Promise<string> => {
    try {
        // Instantiate fresh for each call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a short, exciting one-liner carrom commentary for player ${playerName} who just had a ${event} event.`,
        });
        return response.text || "Nice shot!";
    } catch (e) {
        return "Amazing play!";
    }
};

// Generate seance riddles with structured JSON
export const generateSpiritRiddle = async (): Promise<{ question: string; answer: string }> => {
    try {
        // Instantiate fresh for each call
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate a short spooky riddle for a seance game. One word answer.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        question: { type: Type.STRING },
                        answer: { type: Type.STRING }
                    },
                    required: ["question", "answer"]
                }
            }
        });
        const result = JSON.parse(response.text || '{"question":"","answer":""}');
        return result;
    } catch (e) {
        return { question: "I provide light but have no flame. What am I?", answer: "LAMP" };
    }
};
