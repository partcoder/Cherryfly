
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedMetadata } from "../types";

let ai: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("Missing Gemini API Key. Please check your environment variables.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runWithRetry<T>(fn: () => Promise<T>, retries = 2, initialDelay = 1000): Promise<T> {
  let currentDelay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const isQuotaError = error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota');
      if (i === retries - 1 || !isQuotaError) throw error;
      await delay(currentDelay);
      currentDelay *= 2;
    }
  }
  throw new Error("Max retries exceeded");
}

const cleanJsonString = (text: string): string => {
  // Aggressively strips markdown, leading/trailing garbage, and semicolons
  let cleaned = text.trim();
  // Remove Markdown blocks
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
  // Remove trailing semicolons or non-json characters that LLMs sometimes add
  cleaned = cleaned.replace(/;+$/, '').replace(/^[^{]+/, '').replace(/[^}]+$/, '').trim();
  return cleaned;
};

// Now accepts an array of base64 frames
export const analyzeVideoContent = async (frames: string[]): Promise<GeneratedMetadata> => {
  const modelId = "gemini-3-flash-preview";

  // Prompt optimized for token usage
  const prompt = `Analyze these ${frames.length} frames from a video. Infer the plot/theme. Return VALID JSON: 
  {"title": "Creative Title", "description": "Short synopsis (max 20 words)", "searchContext": "keywords", "genre": ["Genre1", "Genre2"], "mood": "Cinematic Mood"}`;

  return runWithRetry(async () => {
    // Construct parts array with multiple images
    const parts: any[] = frames.map(frame => ({
      inlineData: { mimeType: "image/jpeg", data: frame }
    }));
    parts.push({ text: prompt });

    const response = await getGenAI().models.generateContent({
      model: modelId,
      contents: { parts },
      config: {
        responseMimeType: "application/json",
      },
    });

    if (response.text) {
      try {
        const cleaned = cleanJsonString(response.text);
        return JSON.parse(cleaned) as GeneratedMetadata;
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", response.text);
        throw new Error("AI returned invalid data format. Try again.");
      }
    }
    throw new Error("Empty response from AI");
  });
};

export const generateMoviePoster = async (metadata: GeneratedMetadata, base64Image: string): Promise<string> => {
  const modelId = "gemini-2.5-flash-image";
  // Simplified prompt to save tokens
  const prompt = `Movie poster for "${metadata.title}". Style: ${metadata.mood}. High quality.`;

  return runWithRetry(async () => {
    const response = await getGenAI().models.generateContent({
      model: modelId,
      contents: {
        parts: [
          { inlineData: { mimeType: "image/jpeg", data: base64Image } },
          { text: prompt }
        ],
      },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });

    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
    throw new Error("No image generated");
  });
};

export const generateComicPages = async (base64Image: string, metadata: GeneratedMetadata): Promise<string[]> => {
  const modelId = "gemini-2.5-flash-image";
  const pages: string[] = [];
  const imagePart = { inlineData: { mimeType: "image/jpeg", data: base64Image } };

  for (let i = 1; i <= 4; i++) {
    const response = await getGenAI().models.generateContent({
      model: modelId,
      contents: { parts: [imagePart, { text: `Comic page ${i} for "${metadata.title}". Style: ${metadata.mood}.` }] },
      config: { imageConfig: { aspectRatio: "3:4" } }
    });
    const part = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (part?.inlineData?.data) pages.push(`data:image/png;base64,${part.inlineData.data}`);
    await delay(500);
  }
  return pages;
};
