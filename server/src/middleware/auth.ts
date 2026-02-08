import { type Request, type Response, type NextFunction } from 'express';
import { supabase } from '../db/client';

/**
 * Auth middleware — validates Supabase JWT from Authorization header.
 * Attaches user info to request for downstream middleware and routes.
 *
 * If no token is provided, falls back to anonymous/free tier
 * (allows unauthenticated access during development).
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health') return next();

  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    // No token — anonymous user with free tier
    (req as any).userId = 'anonymous';
    (req as any).userTier = 'free';
    return next();
  }

  try {
    // Verify the JWT with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch user's tier from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    (req as any).userId = user.id;
    (req as any).userTier = profile?.tier ?? 'free';
    next();
  } catch {
    return res.status(401).json({ error: 'Authentication failed' });
  }
}
