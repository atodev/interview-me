import { type Request, type Response, type NextFunction } from 'express';

/**
 * Per-user daily usage tracking.
 * Enforces hard caps on AI tokens and TTS characters per tier.
 *
 * In production, this would use Redis or Supabase.
 * For MVP, in-memory tracking with daily reset.
 */

interface UsageRecord {
  aiTokens: number;
  ttsChars: number;
  interviews: number;
  date: string; // YYYY-MM-DD
}

const DAILY_CAPS: Record<string, { aiTokens: number; ttsChars: number }> = {
  free: { aiTokens: 2_000, ttsChars: 0 },
  pro: { aiTokens: 50_000, ttsChars: 15_000 },
  premium: { aiTokens: 120_000, ttsChars: 40_000 },
};

// In-memory store — replace with Redis/Supabase in production
const usageStore = new Map<string, UsageRecord>();

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function getUserUsage(userId: string): UsageRecord {
  const today = getToday();
  const existing = usageStore.get(userId);

  // Reset if new day
  if (!existing || existing.date !== today) {
    const fresh: UsageRecord = { aiTokens: 0, ttsChars: 0, interviews: 0, date: today };
    usageStore.set(userId, fresh);
    return fresh;
  }

  return existing;
}

export async function usageTracker(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next();

  // userId and userTier set by auth middleware
  const userId = (req as any).userId ?? 'anonymous';
  const tier = (req as any).userTier ?? 'free';
  const caps = DAILY_CAPS[tier] ?? DAILY_CAPS.free;

  const usage = getUserUsage(userId);

  // Check if user has exceeded daily caps
  if (usage.aiTokens >= caps.aiTokens) {
    return res.status(403).json({
      error: 'Daily AI usage limit reached',
      message: 'You\'ve hit your daily limit. Upgrade your plan or try again tomorrow.',
      usage: { current: usage.aiTokens, limit: caps.aiTokens },
    });
  }

  // Check TTS cap for voice routes
  if (req.path.startsWith('/api/voice/tts') && usage.ttsChars >= caps.ttsChars) {
    return res.status(403).json({
      error: 'Daily voice limit reached',
      message: 'Voice feature limit reached for today.',
      usage: { current: usage.ttsChars, limit: caps.ttsChars },
    });
  }

  // Attach usage tracker to request for post-call recording
  (req as any).recordUsage = (aiTokens: number, ttsChars: number) => {
    usage.aiTokens += aiTokens;
    usage.ttsChars += ttsChars;
    usageStore.set(userId, usage);
  };

  next();
}

/**
 * Get usage stats for a user (used by profile endpoint).
 */
export function getUsageStats(userId: string) {
  return getUserUsage(userId);
}
