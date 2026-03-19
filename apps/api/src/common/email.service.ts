import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_PORT === '587' ? false : true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  async sendVerificationEmail(email: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is: ${code}`,
    });
  }

  async sendPasswordResetEmail(email: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
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
    await this.transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: 'Your Admin Account Has Been Created',
      html: `
        <h2>Welcome to Parking App Admin!</h2>
        <p>Hello ${firstName},</p>
        <p>An administrator account has been created for you. Here are your login credentials:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary Password:</strong> ${temporaryPassword}</p>
        <p><strong>Important:</strong> Please change your password immediately after logging in for security purposes.</p>
        <br/>
        <p>Best regards,</p>
        <p>Parking App Team</p>
      `,
    });
  }
}
