import { type Request, type Response, type NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

/**
 * Per-tier rate limiting.
 * Prevents burst abuse and protects backend resources.
 *
 * Tiers:
 *   free:    15 req/min
 *   pro:     30 req/min
 *   premium: 60 req/min
 */

const limiters: Record<string, RateLimiterMemory> = {
  free: new RateLimiterMemory({ points: 15, duration: 60 }),
  pro: new RateLimiterMemory({ points: 30, duration: 60 }),
  premium: new RateLimiterMemory({ points: 60, duration: 60 }),
};

export async function rateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip health checks
  if (req.path === '/health') return next();

  // userId and userTier set by auth middleware
  const userId = (req as any).userId ?? 'anonymous';
  const tier = (req as any).userTier ?? 'free';

  const limiter = limiters[tier] ?? limiters.free;

  try {
    await limiter.consume(userId);
    next();
  } catch {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please slow down. Try again in a moment.',
      retryAfter: 60,
    });
  }
}
