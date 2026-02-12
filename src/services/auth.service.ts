import crypto from 'crypto';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { Response } from 'express';
import { config } from '../config/config.js';
import { User } from '../models/user.models.js';

/**
 * Centralised authentication service encapsulating token generation,
 * cookie handling, and refresh‑token rotation.
 *
 * This keeps security‑sensitive logic in one place and avoids ad‑hoc
 * token handling inside controllers.
 */
export class AuthService {
  /**
   * Generate a short‑lived JWT access token.
   *
   * The token includes the user's tokenVersion so that a "logout all"
   * operation can invalidate all existing access tokens in one step.
   */
  static generateAccessToken(userId: string, tokenVersion: number): string {
    if (!config.jwt.secret) {
      throw new Error('JWT secret is not configured');
    }

    return jwt.sign(
      { userId, tokenVersion },
      config.jwt.secret,
      {
        expiresIn: config.jwt.accessTokenTtl,
      }
    );
  }

  /**
   * Generate a cryptographically‑secure opaque refresh token.
   *
   * We deliberately use a random value instead of a JWT here so that
   * the token has no meaning outside the backend and can be rotated
   * cheaply by changing the stored hash.
   */
  static generateRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * Hash a refresh token before storing it in the database.
   *
   * This ensures that if the database is compromised, attackers cannot
   * directly use stolen refresh tokens.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Set HTTP‑only, secure cookies for access and refresh tokens.
   *
   * We use sameSite=strict and httpOnly to reduce XSS/CSRF risk.
   * Note: `secure: true` requires HTTPS; for local development you may
   * temporarily override COOKIE_SECURE=false in .env.
   */
  static setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isSecure = config.cookies.secure;

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: config.cookies.sameSite,
      domain: config.cookies.domain,
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: config.cookies.sameSite,
      domain: config.cookies.domain,
      maxAge: config.jwt.refreshTokenTtlMs,
      path: '/api/users', // scope to auth routes only
    });
  }

  /**
   * Clear auth cookies on logout / logout‑all.
   */
  static clearAuthCookies(res: Response): void {
    const opts = {
      httpOnly: true,
      secure: config.cookies.secure,
      sameSite: config.cookies.sameSite,
      domain: config.cookies.domain,
      path: '/',
    } as const;

    res.clearCookie('accessToken', opts);
    res.clearCookie('refreshToken', { ...opts, path: '/api/users' });
  }

  /**
   * Validate an access token string and optionally check that the
   * embedded tokenVersion matches what is stored on the user.
   */
  static async validateAccessToken(
    token: string
  ): Promise<{ userId: string; tokenVersion: number } | null> {
    try {
      const decoded = jwt.verify(token, config.jwt.secret!) as JwtPayload & {
        userId: string;
        tokenVersion: number;
      };

      if (!decoded.userId) {
        return null;
      }

      const user = await User.findById(decoded.userId).select('tokenVersion');
      if (!user) {
        return null;
      }

      // If tokenVersion has changed (e.g., logout‑all), reject the token.
      if (typeof decoded.tokenVersion !== 'number' || decoded.tokenVersion !== (user.tokenVersion ?? 0)) {
        return null;
      }

      return {
        userId: decoded.userId,
        tokenVersion: decoded.tokenVersion,
      };
    } catch {
      return null;
    }
  }
}


