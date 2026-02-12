import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import userRoutes from './routes/user.routes.js';
import { config } from './config/config.js';

const app = express();

/**
 * Global security middleware configuration.
 *
 * We enable a hardened Helmet configuration, strict CORS, and rate limiting
 * for high‑risk endpoints (login, password reset) to mitigate common web
 * attacks such as XSS, CSRF, and credential‑stuffing.
 */
app.use(helmet());

app.use(
  cors({
    origin: config.cors.origin.length > 0 ? config.cors.origin : undefined,
    credentials: true,
  })
);

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Basic rate limiter for all requests to avoid abuse
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Routes
app.use('/api/users', userRoutes);

// Generic error‑handling middleware
// NOTE: We avoid leaking internal error details to the client.
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
});

export default app;