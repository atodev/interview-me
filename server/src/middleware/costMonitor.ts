import { type Request, type Response, type NextFunction } from 'express';

/**
 * Global cost circuit breaker.
 * Tracks total spend across all users and degrades service to prevent blowout.
 *
 * Thresholds (monthly):
 *   80%  → Log warning alert
 *   95%  → Degrade: disable voice, shorter reports
 *   100% → Pause free tier, paid tiers get text-only fallback
 */

interface CostTracker {
  month: string; // YYYY-MM
  totalAiCost: number;
  totalTtsCost: number;
  totalSttCost: number;
}

// Configurable monthly budget ceiling (USD)
const MONTHLY_BUDGET = parseFloat(process.env.MONTHLY_BUDGET ?? '500');

// Approximate costs per unit
const COST_PER_AI_TOKEN = 0.000003; // ~$3 per 1M tokens (Sonnet)
const COST_PER_TTS_CHAR = 0.000018; // ~$18 per 1M chars (Turbo v2)
const COST_PER_STT_MINUTE = 0.006; // Whisper

let tracker: CostTracker = {
  month: getCurrentMonth(),
  totalAiCost: 0,
  totalTtsCost: 0,
  totalSttCost: 0,
};

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function getTotalCost(): number {
  return tracker.totalAiCost + tracker.totalTtsCost + tracker.totalSttCost;
}

function getSpendPercent(): number {
  return (getTotalCost() / MONTHLY_BUDGET) * 100;
}

export type DegradationLevel = 'none' | 'warning' | 'degraded' | 'emergency';

export function getDegradationLevel(): DegradationLevel {
  const pct = getSpendPercent();
  if (pct >= 100) return 'emergency';
  if (pct >= 95) return 'degraded';
  if (pct >= 80) return 'warning';
  return 'none';
}

export function recordCost(type: 'ai' | 'tts' | 'stt', units: number) {
  // Reset if new month
  const currentMonth = getCurrentMonth();
  if (tracker.month !== currentMonth) {
    tracker = { month: currentMonth, totalAiCost: 0, totalTtsCost: 0, totalSttCost: 0 };
  }

  switch (type) {
    case 'ai':
      tracker.totalAiCost += units * COST_PER_AI_TOKEN;
      break;
    case 'tts':
      tracker.totalTtsCost += units * COST_PER_TTS_CHAR;
      break;
    case 'stt':
      tracker.totalSttCost += units * COST_PER_STT_MINUTE;
      break;
  }

  // Log warnings
  const pct = getSpendPercent();
  if (pct >= 80 && pct < 81) {
    console.warn(`[COST ALERT] Monthly spend at ${pct.toFixed(1)}% ($${getTotalCost().toFixed(2)}/${MONTHLY_BUDGET})`);
  }
  if (pct >= 95 && pct < 96) {
    console.error(`[COST CRITICAL] Monthly spend at ${pct.toFixed(1)}% — degrading service`);
  }
}

export async function costMonitor(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next();

  const level = getDegradationLevel();
  const tier = (req.headers['x-user-tier'] as string) ?? 'free';

  // Emergency: block free tier entirely
  if (level === 'emergency' && tier === 'free') {
    return res.status(503).json({
      error: 'Service temporarily limited',
      message: 'Free tier is temporarily paused. Please try again later or upgrade.',
    });
  }

  // Degraded: disable voice endpoints
  if (level === 'degraded' && req.path.startsWith('/api/voice')) {
    return res.status(503).json({
      error: 'Voice temporarily unavailable',
      message: 'Voice features are temporarily disabled. Text mode is still available.',
    });
  }

  // Attach degradation level for routes to use (e.g., shorter reports)
  (req as any).degradationLevel = level;

  next();
}

/**
 * Get current cost status (for admin/monitoring).
 */
export function getCostStatus() {
  return {
    month: tracker.month,
    totalCost: getTotalCost().toFixed(2),
    budget: MONTHLY_BUDGET,
    percentUsed: getSpendPercent().toFixed(1),
    degradationLevel: getDegradationLevel(),
    breakdown: {
      ai: tracker.totalAiCost.toFixed(2),
      tts: tracker.totalTtsCost.toFixed(2),
      stt: tracker.totalSttCost.toFixed(2),
    },
  };
}
