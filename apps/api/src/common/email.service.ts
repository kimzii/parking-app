import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  async sendVerificationEmail(email: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify your email',
      text: `Your verification code is: ${code}`,
    });
  }

  async sendPasswordResetEmail(email: string, code: string) {
    await this.transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request',
      text: `Your password reset code is: ${code}`,
    });
  }
}
