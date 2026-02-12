import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Middleware to authenticate users via the access token stored in an
 * HTTP‑only cookie (`accessToken`).
 *
 * This avoids sending tokens in headers or localStorage, which are more
 * susceptible to XSS. We also validate the embedded tokenVersion against
 * the database so that logout‑all invalidates older tokens.
 */
export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const token = req.cookies?.accessToken;

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  const payload = await AuthService.validateAccessToken(token);
  if (!payload) {
    res.status(401).json({ message: 'Invalid or expired token' });
    return;
  }

  req.userId = payload.userId;
  next();
};