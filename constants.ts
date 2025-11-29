import { VoiceOption, StyleTag } from './types';

export const VOICES: VoiceOption[] = [
  { id: 'Zephyr', name: 'Zephyr', label: 'Zephyr (Bright)' },
  { id: 'Puck', name: 'Puck', label: 'Puck (Playful)' },
  { id: 'Charon', name: 'Charon', label: 'Charon (Deep)' },
  { id: 'Kore', name: 'Kore', label: 'Kore (Calm)' },
  { id: 'Fenrir', name: 'Fenrir', label: 'Fenrir (Intense)' },
];

export const STYLE_TAGS: StyleTag[] = [
  { id: 'romantic', label: 'Romantic', prompt: 'Speak in a soft, romantic, and emotional tone.' },
  { id: 'sylheti', label: 'Sylheti', prompt: 'Attempt to use a Sylheti dialect intonation.' },
  { id: 'news', label: 'News Anchor', prompt: 'Speak formally, clearly, and professionally like a news anchor.' },
  { id: 'storyteller', label: 'Storyteller', prompt: 'Speak in an engaging, narrative style suitable for storytelling.' },
  { id: 'sad', label: 'Sad', prompt: 'Speak with a melancholic and slow tone.' },
  { id: 'excited', label: 'Excited', prompt: 'Speak quickly with high energy and excitement.' },
];

export const MODEL_NAME = 'gemini-2.5-flash-preview-tts';
export const SAMPLE_RATE = 24000;
