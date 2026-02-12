import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { UserController } from '../controllers/user.controller.js';
import { validateRequest } from '../middleware/validate.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  signupSchema,
  loginSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
} from '../validators/user.validators.js';

/**
 * Initializes a new Router instance.
 * This router will be used to define user-related routes.
 */
const router = Router();

// High‑risk endpoints are explicitly rate‑limited to slow brute‑force attacks.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/signup', validateRequest(signupSchema), UserController.signup);
router.post('/login', loginLimiter, validateRequest(loginSchema), UserController.login);
router.get('/verify-email/:token', UserController.verifyEmail);
router.post(
  '/forgot-password',
  passwordResetLimiter,
  validateRequest(forgotPasswordSchema),
  UserController.forgotPassword
);
router.post(
  '/reset-password/:token',
  passwordResetLimiter,
  validateRequest(resetPasswordSchema),
  UserController.resetPassword
);

// Session management endpoints
router.post('/refresh', UserController.refreshToken);
router.post('/logout', UserController.logout);
router.post('/logout-all', authenticateToken, UserController.logoutAll);

export default router;