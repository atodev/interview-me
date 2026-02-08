import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { getAccessToken } from '@/store/auth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * TTS service — fetches audio from backend (which proxies to ElevenLabs or Gemini
 * depending on tier). Saves to a temp file and plays via expo-av.
 */
export const ttsService = {
  /**
   * Speak text aloud using tier-appropriate TTS provider.
   * Returns the Sound object so the caller can stop/clean up.
   */
  async speak(text: string, voiceId?: string): Promise<Audio.Sound> {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/voice/tts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ text, voiceId }),
    });

    if (!res.ok) throw new Error('TTS failed');

    // Read response as base64 and write to temp file (React Native has no URL.createObjectURL)
    const blob = await res.blob();
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const tempUri = `${FileSystem.cacheDirectory}tts_${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(tempUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    const { sound } = await Audio.Sound.createAsync({ uri: tempUri });
    await sound.playAsync();

    return sound;
  },

  /**
   * Stop and clean up a playing sound.
   */
  async stop(sound: Audio.Sound | null) {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
    }
  },
};
