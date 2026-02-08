import { ExpoSpeechRecognitionModule } from 'expo-speech-recognition';

/**
 * Speech-to-text service using native iOS/Android speech recognition.
 * No server calls, no rate limits, no API costs.
 *
 * Use `useSpeechRecognitionEvent` hooks in the component for:
 * - "result" events (interim + final transcription)
 * - "volumechange" events (audio levels for visualization)
 */
export const sttService = {
  /**
   * Request permissions and start native speech recognition.
   * Results come via useSpeechRecognitionEvent("result") hook.
   * Volume levels come via useSpeechRecognitionEvent("volumechange") hook.
   */
  async start(): Promise<void> {
    const { granted } = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Speech recognition permission not granted');
    }

    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      volumeChangeEventOptions: {
        enabled: true,
        intervalMillis: 100,
      },
    });
  },

  /**
   * Stop recognition and wait for the final result.
   * The final result will arrive via the "result" event with isFinal=true.
   */
  stop(): void {
    ExpoSpeechRecognitionModule.stop();
  },

  /**
   * Cancel recognition immediately without waiting for a final result.
   */
  cancel(): void {
    ExpoSpeechRecognitionModule.abort();
  },
};
