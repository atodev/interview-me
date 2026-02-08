import { Readable } from 'stream';
import type { VoiceProvider } from './types';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Free-tier voice provider using Gemini's built-in TTS and STT.
 * Lower quality than ElevenLabs but near-zero cost.
 *
 * Note: Gemini 2.0 Flash multimodal capabilities.
 * - TTS: Generate speech from text via the model
 * - STT: Transcribe audio by sending it as inline data
 */
export class GeminiVoiceProvider implements VoiceProvider {
  readonly name = 'gemini';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY ?? '';
  }

  private async fetchWithRetry(url: string, init: RequestInit, retries = 3): Promise<Response> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const response = await fetch(url, init);
      if (response.status === 429 && attempt < retries) {
        const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.warn(`Gemini 429 rate limited, retrying in ${delay / 1000}s (attempt ${attempt + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      return response;
    }
    throw new Error('Gemini rate limit exceeded after retries');
  }

  async textToSpeech(text: string, _voiceId?: string): Promise<Readable> {
    const url = `${API_BASE}/${process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'}:generateContent?key=${this.apiKey}`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `Read the following aloud as a professional interviewer:\n\n${text.slice(0, 2000)}` }],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore', // Professional, clear voice
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini TTS error: ${response.status}`);
    }

    const data = await response.json();
    const audioPart = data.candidates?.[0]?.content?.parts?.find(
      (p: any) => p.inlineData?.mimeType?.startsWith('audio/')
    );

    if (!audioPart) {
      throw new Error('No audio in Gemini response');
    }

    // Decode base64 audio to a readable stream
    const audioBuffer = Buffer.from(audioPart.inlineData.data, 'base64');
    return Readable.from(audioBuffer);
  }

  async speechToText(audioBuffer: Buffer, _filename: string): Promise<string> {
    const url = `${API_BASE}/${process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'}:generateContent?key=${this.apiKey}`;

    const base64Audio = audioBuffer.toString('base64');

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: 'audio/m4a',
                  data: base64Audio,
                },
              },
              {
                text: 'Transcribe this audio exactly as spoken. Return only the transcription text, nothing else.',
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.1,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini STT error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  }
}
