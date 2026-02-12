import type { Request, Response } from "express";
import { User } from "../models/user.models.js";
import bcrypt from "bcryptjs";
import { config } from "../config/config.js";
import type { IUserInput } from "../types/user.types.js";
import { createCustomError } from "../utils/error.js";
import { EmailService } from "../services/email.service.js";
import crypto from "crypto";
import { AuthService } from "../services/auth.service.js";
import type { AuthRequest } from "../middleware/auth.js";

export class UserController {
  // User signup method
  static async signup(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password }: IUserInput = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
      res.status(400).json({
        status: 'error',
        message: 'User already exists',
      });
      return;
      }

      // Verify SMTP connection
      const isEmailServiceWorking = await EmailService.verifyConnection();
      if (!isEmailServiceWorking) {
      res.status(500).json({
        status: 'error',
        message: 'Email service is not available. Please try again later.',
      });
      return;
      }

      // Generate verification token and hash password
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(password, config.bcrypt.saltRounds);

      // Create new user
      const user = await User.create({
        name,
        email,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      try {
      // Send verification email
      await EmailService.sendVerificationEmail(email, name, verificationToken);

      res.status(201).json({
        status: 'success',
        message: 'Registration successful. Please check your email to verify your account.',
      });
      } catch (emailError) {
      // If email fails, mark user as requiring email verification retry
      console.error('Failed to send verification email:', emailError);
      await User.findByIdAndUpdate(user._id, {
        $set: {
        emailVerificationFailed: true
        }
      });

      res.status(201).json({
        status: 'warning',
        message: 'Account created but verification email could not be sent. Please contact support.',
        userId: user._id
      });
      }
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      });
    }
    }

  // User login method
  static async login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
      return;
    }

    // Account lockout check to slow down brute‑force attempts
    if (user.lockUntil && user.lockUntil > new Date()) {
      res.status(423).json({
        status: "error",
        message: "Account temporarily locked. Please try again later.",
      });
      return;
    }

    // Check if user is verified
    if (user.isVerified != true) {
      res.status(401).json({
        status: "error",
        message: "Verify Email",
      });
      return;
    }

    // Validate password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const failed = (user.failedLoginAttempts ?? 0) + 1;
      user.failedLoginAttempts = failed;

      if (failed >= config.auth.maxFailedLoginAttempts) {
        user.lockUntil = new Date(Date.now() + config.auth.accountLockMs);
      }

      await user.save();

      res.status(401).json({
        status: "error",
        message: "Invalid credentials",
      });
      return;
    }

    // Successful login: reset lockout counters
    user.failedLoginAttempts = 0;
    // Remove lockUntil so it isn't present (avoids assigning undefined to a Date-typed property)
    delete (user as any).lockUntil;

    // Issue new access and refresh tokens
    const tokenVersion = user.tokenVersion ?? 0;
    const accessToken = AuthService.generateAccessToken(user._id.toString(), tokenVersion);
    const refreshToken = AuthService.generateRefreshToken();
    const refreshTokenHash = AuthService.hashToken(refreshToken);

    user.refreshTokenHash = refreshTokenHash;
    user.refreshTokenExpires = new Date(Date.now() + config.jwt.refreshTokenTtlMs);
    await user.save();

    AuthService.setAuthCookies(res, accessToken, refreshToken);

    res.json({
      status: "success",
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
    status: "error",
    message: "Internal server error",
    });
  }
  }

  // Email verification method
  static async verifyEmail(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.params.token;
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    if (!token || typeof token !== "string") {
    res.status(400).json({
      status: "error",
      message: "Invalid or expired verification token",
    });
    return;
    }

    // Find user by verification token
    const user = await User.findOne({
    verificationToken: token,
    verificationTokenExpires: { $gt: new Date() },
    });

    if (!user) {
    res.status(400).json({
      status: "error",
      message: "Invalid or expired verification token",
    });
    return;
    }

    // Mark user as verified
    user.isVerified = true;
    delete (user as any).verificationToken;
    delete (user as any).verificationTokenExpires;
    await user.save();

    res.json({
    status: "success",
    message: "Email verified successfully",
    });
  } catch (error) {
    res.status(500).json({
    status: "error",
    message: "Internal server error",
    });
  }
  }

  // Forgot password method
  static async forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
    res.status(404).json({
      status: 'error',
      message: 'No account found with that email',
    });
    return;
    }

    // Verify email service before proceeding
    const isEmailServiceWorking = await EmailService.verifyConnection();
    if (!isEmailServiceWorking) {
    res.status(500).json({
      status: 'error',
      message: 'Email service is not available. Please try again later.',
    });
    return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    try {
    // Send password reset email
    await EmailService.sendPasswordResetEmail(email, user.name, resetToken);

    res.json({
      status: 'success',
      message: 'Password reset instructions sent to your email',
    });
    } catch (emailError) {
    console.error('Failed to send password reset email:', emailError);

    // Reset the token since email failed
    delete (user as any).resetPasswordToken;
    delete (user as any).resetPasswordExpires;
    await user.save();

    res.status(500).json({
      status: 'error',
      message: 'Failed to send password reset email. Please try again later.',
    });
    }
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    });
  }
  }

  // Reset password method
  static async resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const rawToken = req.params.token;
    const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
    const { password } = req.body;

    if (!token || typeof token !== "string") {
    res.status(400).json({
      status: "error",
      message: "Invalid or expired reset token",
    });
    return;
    }

    // Find user by reset token
    const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
    res.status(400).json({
      status: "error",
      message: "Invalid or expired reset token",
    });
    return;
    }

    // Hash new password and save
    const hashedPassword = await bcrypt.hash(
    password,
    config.bcrypt.saltRounds
    );
    user.password = hashedPassword;
    delete (user as any).resetPasswordToken;
    delete (user as any).resetPasswordExpires;
    await user.save();

    res.json({
    status: "success",
    message: "Password reset successfully",
    });
  } catch (error) {
    res.status(500).json({
    status: "error",
    message: "Internal server error",
    });
  }
  }

  /**
   * Refresh access/refresh tokens using the refresh token stored in an
   * HTTP‑only cookie. Implements refresh‑token rotation by invalidating
   * the old token on every successful refresh.
   */
  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const incomingToken = req.cookies?.refreshToken;

      if (!incomingToken) {
        res.status(401).json({ status: 'error', message: 'Refresh token missing' });
        return;
      }

      const hashed = AuthService.hashToken(incomingToken);
      const user = await User.findOne({ refreshTokenHash: hashed });

      if (!user || !user.refreshTokenExpires || user.refreshTokenExpires <= new Date()) {
        // Always clear cookies on suspicious/expired refresh attempts.
        AuthService.clearAuthCookies(res);
        res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
        return;
      }

      const tokenVersion = user.tokenVersion ?? 0;
      const newAccessToken = AuthService.generateAccessToken(user._id.toString(), tokenVersion);
      const newRefreshToken = AuthService.generateRefreshToken();
      const newRefreshHash = AuthService.hashToken(newRefreshToken);

      // Rotate refresh token: replace the stored hash/expiry.
      user.refreshTokenHash = newRefreshHash;
      user.refreshTokenExpires = new Date(Date.now() + config.jwt.refreshTokenTtlMs);
      await user.save();

      AuthService.setAuthCookies(res, newAccessToken, newRefreshToken);

      res.json({
        status: 'success',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
          },
        },
      });
    } catch (error) {
      console.error('Refresh token error:', error);
      AuthService.clearAuthCookies(res);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * Logout from the current device by invalidating the stored refresh
   * token hash and clearing auth cookies.
   */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const incomingToken = req.cookies?.refreshToken;
      if (incomingToken) {
        const hashed = AuthService.hashToken(incomingToken);
        await User.updateOne(
          { refreshTokenHash: hashed },
          {
            $unset: {
              refreshTokenHash: 1,
              refreshTokenExpires: 1,
            },
          }
        );
      }

      AuthService.clearAuthCookies(res);
      res.status(200).json({ status: 'success', message: 'Logged out' });
    } catch (error) {
      console.error('Logout error:', error);
      AuthService.clearAuthCookies(res);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }

  /**
   * Logout from all devices by incrementing tokenVersion and clearing
   * the stored refresh token. All existing access tokens become invalid
   * because their tokenVersion no longer matches the database value.
   */
  static async logoutAll(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.userId) {
        res.status(401).json({ status: 'error', message: 'Authentication required' });
        return;
      }

      const user = await User.findById(req.userId);
      if (!user) {
        res.status(404).json({ status: 'error', message: 'User not found' });
        return;
      }

      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      // Unset refresh token fields instead of assigning `undefined` to string-typed properties
      delete (user as any).refreshTokenHash;
      delete (user as any).refreshTokenExpires;
      await user.save();

      AuthService.clearAuthCookies(res);

      res.status(200).json({
        status: 'success',
        message: 'Logged out from all devices',
      });
    } catch (error) {
      console.error('Logout-all error:', error);
      AuthService.clearAuthCookies(res);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error',
      });
    }
  }
}