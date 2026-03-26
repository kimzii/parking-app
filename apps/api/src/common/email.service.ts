import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend | null;
  private from: string;

  constructor(private configService: ConfigService) {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = resendApiKey ? new Resend(resendApiKey) : null;
    this.from =
      this.configService.get<string>('EMAIL_FROM') ||
      'ParkLink <noreply@kimzie.me>';

    if (!this.resend) {
      this.logger.warn(
        'RESEND_API_KEY is not set. Email sending is disabled until configured.',
      );
    }
  }

  async sendVerificationEmail(email: string, code: string) {
    if (!this.resend) {
      this.logger.warn(
        `Skipping verification email to ${email}: RESEND_API_KEY is not configured.`,
      );
      return;
    }

    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is: ${code}`,
    });
  }

  async sendPasswordResetEmail(email: string, code: string) {
    if (!this.resend) {
      this.logger.warn(
        `Skipping password reset email to ${email}: RESEND_API_KEY is not configured.`,
      );
      return;
    }

    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Password Reset Request',
      text: `Your password reset code is: ${code}`,
    });
  }

  async sendAdminCredentialsEmail(
    email: string,
    firstName: string,
    temporaryPassword: string,
  ) {
    if (!this.resend) {
      this.logger.warn(
        `Skipping admin credentials email to ${email}: RESEND_API_KEY is not configured.`,
      );
      return;
    }

    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Your Admin Account Has Been Created',
      html: `
        <h2>Welcome to ParkLink Admin!</h2>
        <p>Hello ${firstName},</p>
        <p>An administrator account has been created for you. Here are your login credentials:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        <p><strong>Important:</strong> Please change your password immediately after logging in for security purposes.</p>
        <br/>
        <p>Best regards,</p>
        <p>ParkLink Team</p>
      `,
    });
  }
}
