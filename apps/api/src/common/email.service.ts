import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend = new Resend(process.env.RESEND_API_KEY);
  private from = process.env.EMAIL_FROM || 'ParkLink <onboarding@resend.dev>';

  async sendVerificationEmail(email: string, code: string) {
    await this.resend.emails.send({
      from: this.from,
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is: ${code}`,
    });
  }

  async sendPasswordResetEmail(email: string, code: string) {
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
