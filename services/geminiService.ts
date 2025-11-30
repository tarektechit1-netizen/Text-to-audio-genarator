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
  // Use process.env.API_KEY exclusively as per guidelines.
  // Assume it is available and configured in the environment.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key not found. Please check your environment configuration.");
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

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