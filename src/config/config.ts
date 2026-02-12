import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Centralised configuration object.
 *
 * NOTE: Security‑sensitive defaults (like token lifetimes, CORS origins, and
 * cookie flags) are defined here instead of being scattered across the codebase.
 * This makes audits and future hardening changes much easier.
 */
export const config = {
  port: process.env.PORT || 3000,
  mongodb: {
    uri: process.env.MONGO_URI || process.env.MONGODB_URI,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    // Access tokens should be short‑lived to reduce impact of compromise.
    accessTokenTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    // Refresh tokens are longer‑lived but still bounded.
    refreshTokenTtlMs:
      Number(process.env.REFRESH_TOKEN_TTL_MS) || 7 * 24 * 60 * 60 * 1000, // 7 days
  },
  bcrypt: {
    saltRounds: parseInt(process.env.SALT_ROUNDS || '10', 10),
  },
  email: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  frontend: {
    url: process.env.FRONTEND_URL,
  },
  cors: {
    // In production this should be a strict, comma‑separated list of trusted origins.
    origin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean),
  },
  cookies: {
    // Cookies are httpOnly and sameSite=strict by default to mitigate XSS/CSRF.
    secure: process.env.COOKIE_SECURE === 'false' ? false : true,
    sameSite: ('strict' as const),
    domain: process.env.COOKIE_DOMAIN, // optional, for multi‑subdomain setups
  },
  auth: {
    // Lockout policy to slow down online brute‑force attacks.
    maxFailedLoginAttempts:
      Number(process.env.MAX_FAILED_LOGINS) || 5,
    accountLockMs:
      Number(process.env.ACCOUNT_LOCK_MS) || 15 * 60 * 1000, // 15 minutes
  },
} as const;