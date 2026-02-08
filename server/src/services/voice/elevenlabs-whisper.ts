import { Readable } from 'stream';
import OpenAI from 'openai';
import type { VoiceProvider } from './types';

const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

/**
 * Premium voice provider: ElevenLabs TTS + OpenAI Whisper STT.
 * Higher quality, higher cost. Used for Pro/Premium tiers.
 */
export class ElevenLabsWhisperProvider implements VoiceProvider {
  readonly name = 'elevenlabs-whisper';
  private elevenLabsKey: string;
  private openai: OpenAI;

  constructor() {
    this.elevenLabsKey = process.env.ELEVENLABS_API_KEY ?? '';
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async textToSpeech(text: string, voiceId?: string): Promise<Readable> {
    const voice = voiceId ?? DEFAULT_VOICE_ID;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}/stream`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsKey,
        },
        body: JSON.stringify({
          text: text.slice(0, 5000),
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    return new Readable({
      async read() {
        const { done, value } = await reader.read();
        if (done) {
          this.push(null);
        } else {
          this.push(Buffer.from(value));
        }
      },
    });
  }

  async speechToText(audioBuffer: Buffer, filename: string): Promise<string> {
    const file = new File([audioBuffer], filename, { type: 'audio/m4a' });

    const transcription = await this.openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      response_format: 'text',
    });

    return transcription as unknown as string;
  }
}
