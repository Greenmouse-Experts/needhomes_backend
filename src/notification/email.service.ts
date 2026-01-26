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
            <img src="https://res.cloudinary.com/greenmouse-tech/image/upload/v1769280317/needhomes/WhatsApp_Image_2026-01-23_at_13.26.53_xxxz5p.jpg" alt="NeedHomes Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px;">
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
            <img src="https://res.cloudinary.com/greenmouse-tech/image/upload/v1769280317/needhomes/WhatsApp_Image_2026-01-23_at_13.26.53_xxxz5p.jpg" alt="NeedHomes Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px;">
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

  async sendVerificationApprovedEmail(email: string, firstName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: 'KYC Verified — Your account is now verified | NeedHomes',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 680px; margin: 0 auto;">
            <img src="https://res.cloudinary.com/greenmouse-tech/image/upload/v1769280317/needhomes/WhatsApp_Image_2026-01-23_at_13.26.53_xxxz5p.jpg" alt="NeedHomes" style="max-width:160px; display:block; margin: 24px auto;" />
            <div style="background:#e9f8ef; border-left:6px solid #28a745; padding:20px; border-radius:6px;">
              <h2 style="margin:0 0 8px 0; color:#1b5e20;">KYC Approved</h2>
              <p style="margin:0; color:#333;">Hi ${firstName},</p>
              <p style="color:#333;">Good news — your verification documents have been reviewed and <strong>approved</strong>. Your account now has full access to platform features.</p>
              <ul style="color:#333;">
                <li>Full property browsing</li>
                <li>Transactions and payments</li>
                <li>Partner/referral features (if applicable)</li>
              </ul>
              <div style="text-align:center; margin-top:18px;">
                <a href="${process.env.FRONTEND_URL || '#'}" style="background:#28a745; color:#fff; padding:10px 20px; text-decoration:none; border-radius:4px;">Go to Dashboard</a>
              </div>
            </div>
            <p style="color:#999; font-size:12px; margin-top:18px;">If you have questions, reply to this email or contact support.</p>
          </div>
        `,
      });

      this.logger.log(`Verification approved email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification approved email to ${email}`, error);
    }
  }

  async sendVerificationRejectedEmail(email: string, firstName: string, reason: string, templateHtml?: string): Promise<void> {
    try {
      const rejectionBlock = templateHtml
        ? `<div style="margin-top:12px; border:1px dashed #e0e0e0; padding:12px; border-radius:6px;">${templateHtml}</div>`
        : '';

      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: 'KYC Review Result — Action Required | NeedHomes',
        html: `
          <div style="font-family: Arial, sans-serif; max-width:680px; margin:0 auto;">
            <img src="https://res.cloudinary.com/greenmouse-tech/image/upload/v1769280317/needhomes/WhatsApp_Image_2026-01-23_at_13.26.53_xxxz5p.jpg" alt="NeedHomes" style="max-width:160px; display:block; margin:24px auto;" />
            <div style="background:#fff3f2; border-left:6px solid #dc3545; padding:20px; border-radius:6px;">
              <h2 style="margin:0 0 8px 0; color:#b71c1c;">Verification Not Approved</h2>
              <p style="margin:0; color:#333;">Hi ${firstName},</p>
              <p style="color:#333;">We reviewed your verification documents and were unable to approve them.</p>
              <p style="color:#333;"><strong>Reason:</strong> ${reason || 'Insufficient or unclear documentation'}</p>
              <p style="color:#333;">Please review the notes below and update your submission accordingly, then resubmit your KYC.</p>
              ${rejectionBlock}
              <div style="text-align:center; margin-top:18px;">
                <a href="${process.env.FRONTEND_URL}/kyc" style="background:#dc3545; color:#fff; padding:10px 20px; text-decoration:none; border-radius:4px;">Resubmit KYC</a>
              </div>
            </div>
            <p style="color:#999; font-size:12px; margin-top:18px;">If you believe this was a mistake, reply to this email and our support team will assist.</p>
          </div>
        `,
      });

      this.logger.log(`Verification rejected email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send verification rejected email to ${email}`, error);
    }
  }

  async sendPasswordResetOTP(email: string, otp: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromEmail,
        to: email,
        subject: 'Reset Your Password - Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <img src="https://res.cloudinary.com/greenmouse-tech/image/upload/v1769280317/needhomes/WhatsApp_Image_2026-01-23_at_13.26.53_xxxz5p.jpg" alt="NeedHomes Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px;">
            <h2 style="color: #333;">Password Reset Verification</h2>
            <p>Use the code below to verify your password reset request:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #666;">This code will expire in 5 minutes. Do not share it with anyone.</p>
            <p style="color: #666;">If you didn't request this, you can safely ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">NeedHomes - Your trusted real estate platform</p>
          </div>
        `,
      });

      this.logger.log(`Password reset OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${email}`, error);
      throw new Error('Failed to send password reset OTP');
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
            <img src="https://res.cloudinary.com/greenmouse-tech/image/upload/v1769280317/needhomes/WhatsApp_Image_2026-01-23_at_13.26.53_xxxz5p.jpg" alt="NeedHomes Logo" style="max-width: 200px; height: auto; display: block; margin: 0 auto 20px;">
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
