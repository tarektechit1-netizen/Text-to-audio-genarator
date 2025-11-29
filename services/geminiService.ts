import { GoogleGenAI, Modality } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { base64ToUint8Array } from "../utils/audioUtils";

interface TTSResult {
  pcmData: Uint8Array;
}

export const generateSpeech = async (
  text: string, 
  voiceName: string, 
  instructions?: string
): Promise<TTSResult> => {
  // Use process.env.API_KEY as per guidelines.
  // Assume process.env.API_KEY is pre-configured, valid, and accessible.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  let promptText = text;
  if (instructions && instructions.trim().length > 0) {
    promptText = `Style Instruction: ${instructions}\n\nText to speak:\n${text}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [{ parts: [{ text: promptText }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini.");
    }

    const pcmData = base64ToUint8Array(base64Audio);
    return { pcmData };

  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
};