import mongoose, { Schema } from 'mongoose';
import type { IUser } from '../types/user.types.js';

const userSchema = new Schema<IUser>(
  {
    name: { 
      type: String, 
      required: true, 
      trim: true 
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true 
    },
    password: { 
      type: String, 
      required: true 
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    isVerified: {
        type: Boolean,
        default: false,
      },
      verificationToken: String,
      verificationTokenExpires: Date,
    },
  { 
    timestamps: true 
  }
);


export const User = mongoose.model<IUser>('User', userSchema);