import {z} from 'zod'

/**
 * Schema for validating user signup data.
 * 
 * This schema ensures that the user provides:
 * - A name that is a string with a minimum length of 2 and a maximum length of 50.
 * - An email that is a valid email address.
 * - A password that is a string with a minimum length of 8 and a maximum length of 100.
 */

export const    signupSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(100),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});