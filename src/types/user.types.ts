/**
 * Interface representing a User.
 * 
 * @interface IUser
 * @property {string} _id - Unique identifier for the user.
 * @property {string} name - Name of the user.
 * @property {string} email - Email address of the user.
 * @property {string} password - Password of the user.
 * @property {Boolean} isVerified - Indicates if the user's email is verified.
 * @property {string} [resetPasswordToken] - Token used for resetting the password (optional).
 * @property {Date} [resetPasswordExpires] - Expiry date for the reset password token (optional).
 * @property {string} [verificationToken] - Token used for email verification (optional).
 * @property {Date} [verificationTokenExpires] - Expiry date for the verification token (optional).
 * @property {number} [failedLoginAttempts] - Counter for consecutive failed login attempts.
 * @property {Date} [lockUntil] - Timestamp until which the account is locked.
 * @property {string} [refreshTokenHash] - Hashed refresh token stored for rotation.
 * @property {Date} [refreshTokenExpires] - Expiry timestamp for the stored refresh token.
 * @property {number} [tokenVersion] - Version used to invalidate all existing tokens (logout‑all).
 * @property {Date} createdAt - Date when the user was created.
 * @property {Date} updatedAt - Date when the user was last updated.
 */
export interface IUser {
    _id: string;
    name: string;
    email: string;
    password: string;
    isVerified: Boolean;
    resetPasswordToken?: string;
    resetPasswordExpires?: Date;
    verificationToken?: string;
    verificationTokenExpires?: Date;
    failedLoginAttempts?: number;
    lockUntil?: Date;
    refreshTokenHash?: string;
    refreshTokenExpires?: Date;
    tokenVersion?: number;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface IUserInput {
    name: string;
    email: string;
    password: string;
  }