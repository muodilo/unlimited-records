import nodemailer from 'nodemailer'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config/config.js'

// __dirname is not available in ES modules by default, so we recreate it here
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class EmailService {
  // Create a transporter object using the default SMTP transport
  private static transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
    debug: true,
    logger: true
  });

  // Read and return the email template content from the specified file
  private static async getTemplate(templateName: string): Promise<string> {
    const templatePath = path.join(__dirname, '../templates', `${templateName}.html`);
    return await fs.readFile(templatePath, 'utf-8');
  }

  // Replace variables in the template with actual values
  private static replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    return Object.entries(variables).reduce(
      (acc, [key, value]) => acc.replace(new RegExp(`{{${key}}}`, 'g'), value),
      template
    );
  }

  // Verify the SMTP connection
  static async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      console.error('SMTP connection verification failed:', error);
      return false;
    }
  }

  // Send a verification email to the specified recipient
  static async sendVerificationEmail(
    to: string,
    name: string,
    verificationToken: string
  ): Promise<void> {
    try {
      const template = await this.getTemplate('verifyEmail');
      const verificationLink = `${config.frontend.url}/verify-email?token=${verificationToken}`;

      const html = this.replaceTemplateVariables(template, {
        name,
        verificationLink,
      });

      const mailOptions = {
        from: `"FredAbod" <${config.email.user}>`,
        to,
        subject: 'Verify Your Email',
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Verification email sent successfully:', info.messageId);
    } catch (error) {
      console.error('Error sending verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  // Send a password reset email to the specified recipient
  static async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string
  ): Promise<void> {
    try {
      const template = await this.getTemplate('resetPassword');
      const resetLink = `${config.frontend.url}/reset-password?token=${resetToken}`;

      const html = this.replaceTemplateVariables(template, {
        name,
        resetLink,
      });

      const mailOptions = {
        from: `"FredAbod" <${config.email.user}>`,
        to,
        subject: 'Reset Your Password',
        html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Password reset email sent successfully:', info.messageId);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}