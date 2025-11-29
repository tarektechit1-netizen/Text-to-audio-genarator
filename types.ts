
export enum TTSStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface QueueItem {
  id: string;
  text: string;
  voiceName: string;
  pace: string;
  instructions: string;
  status: TTSStatus;
  audioUrl?: string;
  audioBlob?: Blob;
  pcmData?: Uint8Array; // Storing raw PCM for merging
  durationStr?: string;
  errorMessage?: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  label: string;
}

export interface StyleTag {
  id: string;
  label: string;
  prompt: string;
}

// Gemini specific types
export interface GenerationConfig {
  text: string;
  voiceName: string;
  instructions?: string;
}
