import { Audio } from 'expo-av';
import { getAccessToken } from '@/store/auth';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * Speech-to-text service using Whisper via backend proxy.
 * Records audio on device, sends to backend for transcription.
 */
export const sttService = {
  recording: null as Audio.Recording | null,

  /**
   * Start recording audio from the microphone.
   */
  async startRecording(): Promise<void> {
    const permission = await Audio.requestPermissionsAsync();
    if (!permission.granted) {
      throw new Error('Microphone permission not granted');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    this.recording = recording;
  },

  /**
   * Stop recording and transcribe the audio.
   * Returns the transcribed text.
   */
  async stopAndTranscribe(): Promise<string> {
    if (!this.recording) throw new Error('No active recording');

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;

    if (!uri) throw new Error('No recording URI');

    // Send audio to backend for Whisper transcription
    const formData = new FormData();
    formData.append('audio', {
      uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/api/voice/stt`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) throw new Error('Transcription failed');

    const { text } = await res.json();
    return text;
  },

  /**
   * Cancel an in-progress recording without transcribing.
   */
  async cancel(): Promise<void> {
    if (this.recording) {
      await this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
  },
};
