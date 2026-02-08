import type { VoiceProvider } from './types';
import { ElevenLabsWhisperProvider } from './elevenlabs-whisper';
import { GeminiVoiceProvider } from './gemini';

export type { VoiceProvider } from './types';

// Singleton instances
let elevenLabsInstance: ElevenLabsWhisperProvider | null = null;
let geminiInstance: GeminiVoiceProvider | null = null;

function getElevenLabs(): ElevenLabsWhisperProvider {
  if (!elevenLabsInstance) elevenLabsInstance = new ElevenLabsWhisperProvider();
  return elevenLabsInstance;
}

function getGeminiVoice(): GeminiVoiceProvider {
  if (!geminiInstance) geminiInstance = new GeminiVoiceProvider();
  return geminiInstance;
}

/**
 * Get the voice provider for a given tier.
 *
 * Strategy:
 *   free    → Gemini built-in TTS/STT (near-zero cost)
 *   pro     → ElevenLabs + Whisper (premium quality)
 *   premium → ElevenLabs + Whisper (premium quality)
 */
export function getVoiceProvider(tier: string): VoiceProvider {
  switch (tier) {
    case 'pro':
    case 'premium':
      return getElevenLabs();
    case 'free':
    default:
      return getGeminiVoice();
  }
}
