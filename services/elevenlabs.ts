import * as Speech from 'expo-speech';
import { useVoiceStore } from '@/store/voice';

/**
 * TTS service — uses native iOS/Android speech synthesis.
 * Reads voice, rate, and pitch from the voice preferences store.
 * No server calls, no rate limits, no API costs.
 */
export const ttsService = {
  /**
   * Speak text aloud using the native speech synthesizer.
   * Resolves when speech finishes. Rejects on error.
   */
  speak(text: string): Promise<void> {
    const { voiceId, rate, pitch } = useVoiceStore.getState();
    return new Promise((resolve, reject) => {
      Speech.speak(text, {
        language: 'en-US',
        voice: voiceId ?? undefined,
        rate,
        pitch,
        onDone: () => resolve(),
        onError: (err) => reject(err),
      });
    });
  },

  /**
   * Stop any in-progress speech.
   */
  stop() {
    Speech.stop();
  },

  /**
   * Check if currently speaking.
   */
  isSpeaking(): Promise<boolean> {
    return Speech.isSpeakingAsync();
  },
};
