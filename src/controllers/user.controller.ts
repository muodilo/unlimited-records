import type { Request, Response } from "express";
import { User } from "../models/user.models.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config/config.js";
import type { IUserInput } from "../types/user.types.js";
import { createCustomError } from "../utils/error.js";
import { EmailService } from "../services/email.service.js";
import crypto from "crypto";

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
    res.status(401).json({
      status: "error",
      message: "Invalid credentials",
    });
    return;
    }

    // Generate JWT token
    if (!config.jwt.secret) {
      console.error("JWT secret is not configured");
      res.status(500).json({ status: "error", message: "Authentication configuration error" });
      return;
    }
    const jwtSecret: jwt.Secret = config.jwt.secret as jwt.Secret;
    const jwtExpiresIn: jwt.SignOptions['expiresIn'] = (config.jwt.expiresIn as jwt.SignOptions['expiresIn']) ?? '1h';
    const token = jwt.sign(
      { userId: user._id },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.json({
    status: "success",
    data: {
      token,
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
}