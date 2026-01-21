import { Injectable, Logger, Inject } from '@nestjs/common';
import { Transporter } from 'nodemailer';
import { NODEMAILER_TRANSPORTER } from './providers/nodemailer.provider';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;

  constructor(
    @Inject(NODEMAILER_TRANSPORTER)
    private readonly transporter: Transporter,
  ) {
    const fromName = process.env.MAIL_FROM_NAME || 'NeedHomes';
    const fromEmail = process.env.MAIL_FROM_EMAIL || process.env.MAIL_USER;
    this.fromEmail = `"${fromName}" <${fromEmail}>`;
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: 'Verify Your Email - NeedHomes',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Your verification code is:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666;">This code will expire in 5 minutes.</p>
            <p style="color: #666;">If you didn't request this code, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">NeedHomes - Your trusted real estate platform</p>
          </div>
        `,
      });

      this.logger.log(`OTP sent successfully to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}`, error);
      throw new Error('Failed to send OTP email');
    }
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: 'Email Verified - Complete Your KYC | NeedHomes',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verified Successfully!</h2>
            <p>Hi ${firstName},</p>
            <p>Your email has been successfully verified. Welcome to NeedHomes!</p>
            
            <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
              <strong>⚠️ Important Next Step:</strong>
              <p style="margin: 10px 0 0 0;">To gain full access to all platform features, please complete your KYC (Know Your Customer) verification.</p>
            </div>

            <p><strong>What you can do now:</strong></p>
            <ul>
              <li>Browse limited content</li>
              <li>View your profile</li>
            </ul>

            <p><strong>After KYC verification, you'll unlock:</strong></p>
            <ul>
              <li>Full property browsing</li>
              <li>Investment opportunities</li>
              <li>Transaction capabilities</li>
              <li>Premium features</li>
            </ul>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/kyc" style="background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Complete KYC Now
              </a>
            </div>

            <p>If you have any questions, our support team is here to help.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">NeedHomes - Your trusted real estate platform</p>
          </div>
        `,
      });

      this.logger.log(`Welcome email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error);
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: 'Reset Your Password - NeedHomes',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666;">This link will expire in 1 hour.</p>
            <p style="color: #666;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">NeedHomes - Your trusted real estate platform</p>
          </div>
        `,
      });

      this.logger.log(`Password reset email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error);
      throw new Error('Failed to send password reset email');
    }
  }
}
