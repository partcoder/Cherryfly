import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedMetadata } from "../types";

// Initialize Gemini Client Lazily
let ai: GoogleGenAI | null = null;

const getGenAI = () => {
  if (!ai) {
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing Gemini API Key. Please check your environment variables.");
    }
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Executes a function with exponential backoff retry logic for handling 429 errors.
 */
async function runWithRetry<T>(fn: () => Promise<T>, retries = 3, initialDelay = 2000): Promise<T> {
  let currentDelay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      // Check for 429 (Resource Exhausted) or 503 (Service Unavailable)
      const isRateLimit =
        error?.status === 429 ||
        error?.code === 429 ||
        error?.message?.includes('429') ||
        error?.status === 'RESOURCE_EXHAUSTED';

      // Check for 403 (Permission Denied) - we log specifically to help debugging
      if (error?.status === 403 || error?.code === 403 || error?.message?.includes('403')) {
        console.error("Gemini PERMISSION_DENIED (403). The requested model is not accessible with the current API key.");
        throw error;
      }

      if (i === retries - 1 || !isRateLimit) {
        throw error;
      }

      console.warn(`API Rate limit hit. Retrying in ${currentDelay}ms...`);
      await delay(currentDelay);
      currentDelay *= 2; // Exponential backoff
    }
  }
  throw new Error("Max retries exceeded");
}

/**
 * Analyzes a video frame (base64 image) to generate a title, synopsis, and genre.
 */
export const analyzeVideoFrame = async (base64Image: string): Promise<GeneratedMetadata> => {
  // Using gemini-2.5-flash-lite-latest as the most permissive multimodal model
  const modelId = "gemini-2.5-flash-lite-latest";

  const prompt = `
    Analyze this image for a movie library.
    Return a JSON object with:
    1. title: A cinematic title.
    2. description: Short synopsis (max 20 words).
    3. searchContext: Keywords for search.
    4. genre: Array of 1-3 genres.
    5. mood: Visual mood description.
  `;

  return runWithRetry(async () => {
    try {
      const response = await getGenAI().models.generateContent({
        model: modelId,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              searchContext: { type: Type.STRING },
              genre: { type: Type.ARRAY, items: { type: Type.STRING } },
              mood: { type: Type.STRING },
            },
            required: ["title", "description", "searchContext", "genre", "mood"],
          },
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as GeneratedMetadata;
      }
      throw new Error("No text response from Gemini");
    } catch (error) {
      console.error("Gemini Analysis Error:", error);
      throw error;
    }
  });
};

/**
 * Generates a movie poster based on the metadata and reference image.
 */
export const generateMoviePoster = async (metadata: GeneratedMetadata, base64Image: string): Promise<string> => {
  const modelId = "gemini-2.5-flash-image";

  const prompt = `
    Professional movie poster for "${metadata.title}".
    Genre: ${metadata.genre.join(", ")}.
    Style: ${metadata.mood}, cinematic photography.
    Keep consistent with the person/subject in the reference image.
    Aspect Ratio 3:4.
  `;

  return runWithRetry(async () => {
    try {
      const response = await getGenAI().models.generateContent({
        model: modelId,
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image,
              },
            },
            { text: prompt }
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "3:4",
          }
        }
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No image was generated.");
    } catch (error) {
      console.error("Poster generation failed:", error);
      throw error;
    }
  });
};

/**
 * Generates a 4-page comic strip based on the metadata and reference image.
 */
export const generateComicPages = async (base64Image: string, metadata: GeneratedMetadata): Promise<string[]> => {
  const modelId = "gemini-2.5-flash-image";
  const pages: string[] = [];

  const basePrompt = `
    Comic book page for "${metadata.title}".
    Style: ${metadata.mood}, high-quality comic art.
    Subject must match the reference image.
    Aspect Ratio 3:4.
  `;

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  const pagePrompts = [
    "Page 1: The journey begins.",
    "Page 2: A sudden challenge.",
    "Page 3: The hero's triumph.",
    "Page 4: A new hope."
  ];

  try {
    for (const pageSpecificInstruction of pagePrompts) {
      if (pages.length > 0) {
        await delay(1200);
      }

      await runWithRetry(async () => {
        const response = await getGenAI().models.generateContent({
          model: modelId,
          contents: { parts: [imagePart, { text: `${basePrompt} ${pageSpecificInstruction}` }] },
          config: { imageConfig: { aspectRatio: "3:4" } }
        });

        let pageAdded = false;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData && part.inlineData.data) {
            pages.push(`data:image/png;base64,${part.inlineData.data}`);
            pageAdded = true;
            break;
          }
        }
        if (!pageAdded) throw new Error("A comic page failed to generate.");
      });
    }

    return pages;
  } catch (error) {
    console.error("Comic generation failed:", error);
    throw error;
  }
};