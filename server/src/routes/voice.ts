import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { getVoiceProvider } from '../services/voice';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const voiceRoutes = Router();

/**
 * Extract user tier from request (set by auth middleware).
 */
function getTier(req: Request): string {
  return (req as any).userTier ?? 'free';
}

/**
 * POST /api/voice/tts
 * Text-to-speech. Provider selected by tier:
 *   free    → Gemini built-in TTS
 *   pro     → ElevenLabs
 *   premium → ElevenLabs
 */
voiceRoutes.post('/tts', async (req: Request, res: Response) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Missing text' });
    }

    const voice = getVoiceProvider(getTier(req));
    const audioStream = await voice.textToSpeech(text, voiceId);

    res.setHeader('Content-Type', 'audio/mpeg');
    audioStream.pipe(res);
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: 'TTS failed' });
  }
});

/**
 * POST /api/voice/stt
 * Speech-to-text. Provider selected by tier:
 *   free    → Gemini built-in STT
 *   pro     → OpenAI Whisper
 *   premium → OpenAI Whisper
 */
voiceRoutes.post('/stt', upload.single('audio'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file' });
    }

    const voice = getVoiceProvider(getTier(req));
    const text = await voice.speechToText(req.file.buffer, req.file.originalname);
    res.json({ text });
  } catch (error) {
    console.error('STT error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});
