import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Middleware to authenticate a JWT token from the request headers.
 *
 * @param req - The request object, extended to include `userId` if authentication is successful.
 * @param res - The response object.
 * @param next - The next middleware function in the stack.
 *
 * @returns A response with status 401 if no token is provided, or status 403 if the token is invalid or expired.
 *
 * @remarks
 * This middleware expects the JWT token to be provided in the `Authorization` header in the format `Bearer <token>`.
 * If the token is valid, the `userId` from the token payload is attached to the request object.
 */
export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, config?.jwt?.secret!) as { userId: string };
    req.userId = decoded.userId;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};