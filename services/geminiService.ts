
import { GoogleGenAI, Type } from "@google/genai";
import { QuizChallenge, ImageSize } from "../types";

const getGenAI = (): GoogleGenAI => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Fallback riddles if AI is offline
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

// Switched to gemini-3-flash-preview for better rate limits on simple creative tasks
export const generateRescueRiddle = async (victimName: string, rescuerName: string): Promise<Omit<QuizChallenge, 'forPlayerId' | 'victimId'>> => {
  const ai = getGenAI();
  try {
    const prompt = `Create a short, fun riddle or trivia question to save a player from a snake in a board game.
    The riddle should be solvable by a general audience.
    
    Context: ${rescuerName} is trying to save ${victimName} from falling down a snake.
    
    Return strict JSON:
    {
        "question": "The riddle text...",
        "answer": "The correct answer",
        "options": ["The correct answer", "Wrong 1", "Wrong 2", "Wrong 3"]
    }
    Ensure the options are mixed up.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json'
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text);

  } catch (error) {
    console.warn("AI Gen failed, using static riddle", error);
    const r = FALLBACK_RIDDLES[Math.floor(Math.random() * FALLBACK_RIDDLES.length)];
    return r;
  }
};

// Using gemini-3-pro-image-preview for high-quality image generation; user select API key is required in UI.
export const generateGameImage = async (prompt: string, size: ImageSize): Promise<string | null> => {
  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: size
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image generation failed:", error);
    return null;
  }
};

// Switched to gemini-3-flash-preview for fast and reliable validation without hitting rate limits
export const validateNPATAnswers = async (letter: string, answers: { name: string, place: string, animal: string, thing: string }): Promise<Record<string, boolean>> => {
    const ai = getGenAI();
    try {
        const prompt = `Validate specific words for the game Name, Place, Animal, Thing.
        Target Letter: ${letter}
        
        Words to check:
        1. Name (Person): "${answers.name}"
        2. Place (Location): "${answers.place}"
        3. Animal: "${answers.animal}"
        4. Thing (Object): "${answers.thing}"

        Rules:
        - Word must start with the Target Letter (case insensitive).
        - Word must actually belong to the category.
        - Ignore minor spelling errors if clearly recognizable.
        - If input is empty, mark false.

        Return strict JSON:
        {
            "name": boolean,
            "place": boolean,
            "animal": boolean,
            "thing": boolean
        }`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { 
                responseMimeType: 'application/json'
            }
        });
        
        const text = response.text;
        if (!text) return { name: true, place: true, animal: true, thing: true };
        return JSON.parse(text);

    } catch (e) {
        console.error("AI Validation Error", e);
        return { name: true, place: true, animal: true, thing: true };
    }
};

// Replaced Gemini AI with Dictionary API for word validation
export const validateWord = async (word: string, letter: string, minLength: number): Promise<{ isValid: boolean; reason?: string }> => {
    const cleanWord = word.trim();
    const cleanLetter = letter.toUpperCase();

    // 1. Basic Rules Check (Local)
    if (!cleanWord.toUpperCase().startsWith(cleanLetter)) {
        return { isValid: false, reason: `Must start with '${cleanLetter}'` };
    }

    if (cleanWord.length < minLength) {
        return { isValid: false, reason: `Min length is ${minLength}` };
    }

    // 2. API Check
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

// Kept fast for real-time commentary
export const generateCarromCommentary = async (playerName: string, event: 'FOUL' | 'QUEEN' | 'WIN' | 'MISS' | 'SHOT'): Promise<string> => {
  const ai = getGenAI();
  try {
    const prompt = `Generate a very short, witty, 1-sentence commentary for a Carrom game (tabletop game like pool).
    Player: ${playerName}
    Event: ${event}
    
    Context:
    - FOUL: Pocketed the striker (penalty).
    - QUEEN: Pocketed the Queen piece (50 points, huge play).
    - WIN: Won the game.
    - SHOT: A nice successful shot.
    - MISS: Missed an easy shot.

    Tone: Excited e-sports commentator. Max 10 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text?.trim() || "";
  } catch (e) {
    return "";
  }
};

// Switched to gemini-3-flash-preview for riddle generation
export const generateSpiritRiddle = async (): Promise<{ question: string; answer: string }> => {
    const ai = getGenAI();
    try {
        const prompt = `Generate a mysterious, slightly spooky (but safe for work) riddle with a single-word answer.
        The answer must be between 3 and 6 letters long.
        Context: A spirit board game.
        
        Return strict JSON:
        {
            "question": "The riddle text...",
            "answer": "WORD"
        }`;
        
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });
        
        return JSON.parse(response.text || '{}');
    } catch (e) {
        return { question: "I provide light but have no flame. What am I?", answer: "LAMP" };
    }
};
