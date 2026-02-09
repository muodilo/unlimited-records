import type { Response } from 'express';

export class CustomError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    // Set the prototype explicitly to fix instanceof checks
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}

export const createCustomError = (message: string, statusCode: number): CustomError => {
  return new CustomError(message, statusCode);
};

/**
 * Handles errors in controller functions and sends appropriate HTTP responses.
 *
 * @param error - The error object that was thrown.
 * @param res - The Express response object.
 * @returns The HTTP response with the appropriate status code and error message.
 *
 * If the error is an instance of `CustomError`, it sends a response with the status code and message from the error.
 * Otherwise, it logs the error to the console and sends a 500 Internal Server Error response.
 */
export const handleControllerError = (error: unknown, res: Response): Response => {
  if (error instanceof CustomError) {
    return res.status(error.statusCode).json({
      status: 'error',
      message: error.message,
    });
  }

  console.error('Unexpected error:', error);
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};