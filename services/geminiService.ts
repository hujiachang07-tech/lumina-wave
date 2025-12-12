import { GoogleGenAI, Type } from "@google/genai";
import { InterpretationResult } from "../types";

export const interpretPattern = async (imageBase64: string): Promise<InterpretationResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Clean up base64 string if it contains headers
  const data = imageBase64.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: data
            }
          },
          {
            text: `You are a mystical sage interpreting a "Light Brocade" woven by a user on a digital loom. 
            Analyze the visual patterns, the density of the light lines, and the overall flow.
            
            Provide two things in JSON format:
            1. 'title': A poetic, ancient-style name for this fabric (e.g., "Silk of the Morning Mist", "Dragon Scale Ripple").
            2. 'poem': A very short, ethereal interpretation (max 2 sentences) of what this pattern signifies for the weaver's fortune or state of mind.
            
            Tone: Mystical, serene, encouraging, ancient Chinese fantasy (Xianxia) aesthetic.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            poem: { type: Type.STRING }
          },
          required: ["title", "poem"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from Oracle");
    
    return JSON.parse(resultText) as InterpretationResult;
  } catch (error) {
    console.error("Gemini Interpretation Failed:", error);
    return {
      title: "The Unseen Weave",
      poem: " The mists are too thick to see clearly, but the light remains within your heart."
    };
  }
};