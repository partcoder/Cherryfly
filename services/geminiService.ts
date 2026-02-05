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
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    You are an AI archivist for a visual memory library called Cherryfly.
    Analyze this image (video frame or photo).
    
    1. Create a "title": Cinematic and catchy.
    2. Create a "description": A short, intriguing synopsis (max 25 words) for display.
    3. Create a "searchContext": A VERY DETAILED description of everything in the image. Include:
       - Visual details (colors, objects, clothing, setting, background).
       - Transcription of ANY text visible in the image.
       - Emotions, actions, and potential context.
       - Keywords that someone might search for to find this memory.
    4. "genre": List of genres.
    5. "mood": Visual mood for poster generation.
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
              searchContext: { type: Type.STRING, description: "Detailed analysis for search indexing" },
              genre: { type: Type.ARRAY, items: { type: Type.STRING } },
              mood: { type: Type.STRING, description: "Visual mood description for poster generation" },
            },
            required: ["title", "description", "searchContext", "genre", "mood"],
          },
        },
      });

      if (response.text) {
        return JSON.parse(response.text) as GeneratedMetadata;
      }
      throw new Error("No JSON response from Gemini");
    } catch (error) {
      console.error("Analysis failed:", error);
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
    A high-quality, cinematic movie poster for a film titled "${metadata.title}".
    Synopsis: ${metadata.description}.
    Genre: ${metadata.genre.join(", ")}.
    
    CRITICAL INSTRUCTION: The main character on this poster MUST LOOK EXACTLY like the person in the provided reference image. 
    Maintain facial features, hair, and general vibe.
    
    Visual Style: ${metadata.mood}, highly detailed, dramatic lighting, professional typography.
    Do not include any text or credits on the poster other than the title if possible, or just pure art.
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

      // Check for inline data (image)
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      throw new Error("No image generated.");
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
    Create a comic book page featuring the MAIN CHARACTER from the provided reference image.
    CRITICAL: You must keep the character's facial features, hairstyle, and clothing EXACTLY consistent with the provided reference image.
    
    Title: "${metadata.title}".
    Story Context: ${metadata.description}.
    Visual Style: ${metadata.mood}, classic comic book art style, cel shaded, vibrant colors, speech bubbles.
    Aspect Ratio 3:4.
  `;

  const extractImage = (response: any) => {
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
    }
    return null;
  };

  const imagePart = {
    inlineData: {
      mimeType: "image/jpeg",
      data: base64Image,
    },
  };

  const pagePrompts = [
    "Page 1 of 4. Introduce the character (from reference) in their setting. Establish the inciting incident or conflict.",
    "Page 2 of 4. The character faces an obstacle. Tension rises. Action sequence or emotional dialogue.",
    "Page 3 of 4. The climax of the scene. High drama, dynamic angles, major revelation or confrontation.",
    "Page 4 of 4. Resolution or cliffhanger. The aftermath. Fade out or dramatic final panel."
  ];

  try {
    for (const pageSpecificInstruction of pagePrompts) {
      // Add a small delay before each request to respect rate limits (Requests Per Minute)
      // Especially important since we are doing a loop
      if (pages.length > 0) {
        await delay(2000);
      }

      await runWithRetry(async () => {
        const fullPrompt = `${basePrompt} ${pageSpecificInstruction}`;

        const response = await getGenAI().models.generateContent({
          model: modelId,
          contents: { parts: [imagePart, { text: fullPrompt }] },
          config: { imageConfig: { aspectRatio: "3:4" } }
        });

        const pageData = extractImage(response);
        if (pageData) {
          pages.push(`data:image/png;base64,${pageData}`);
        }
      });
    }

    if (pages.length === 0) throw new Error("Failed to generate comic pages");

    return pages;
  } catch (error) {
    console.error("Comic generation failed:", error);
    throw error;
  }
};