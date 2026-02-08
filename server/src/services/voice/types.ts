import type { Readable } from 'stream';

/**
 * Voice provider interface — TTS and STT.
 */
export interface VoiceProvider {
  readonly name: string;

  textToSpeech(text: string, voiceId?: string): Promise<Readable>;

  speechToText(audioBuffer: Buffer, filename: string): Promise<string>;
}
