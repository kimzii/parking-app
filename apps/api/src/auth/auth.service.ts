/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EmailService } from '../common/email.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // Generate 6-digit verification code
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Hash password
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // Compare password
  private async comparePassword(
    password: string,
    hash: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // Generate JWT tokens
  private async generateTokens(userId: string, email: string, roles: string[]) {
    const payload = { sub: userId, email, roles };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
  // Register
  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const verificationExpiry = new Date();
    verificationExpiry.setMinutes(verificationExpiry.getMinutes() + 1);

    // Find DRIVER role
    const driverRole = await this.prisma.role.findUnique({
      where: { name: 'DRIVER' },
    });
    if (!driverRole) {
      throw new BadRequestException('Default role DRIVER not found');
    }

    // Create user with DRIVER role
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        verificationCode,
        verificationExpiry,
        userRoles: {
          create: {
            roleId: driverRole.id,
            status: 'PENDING',
          },
        },
        driver: {
          create: {},
        },
      },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(email, verificationCode);

    return {
      message: 'Registration successful. Please verify your email.',
      email: user.email,
      verificationCode, // Remove in production, only for testing
    };
  }

  // Verify Email
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, code } = verifyEmailDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (user.verificationCode !== code) {
      throw new BadRequestException('Invalid verification code');
    }

    if (user.verificationExpiry && user.verificationExpiry < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationExpiry: null,
      },
    });

    return {
      message: 'Email verified successfully',
    };
  }

  // Login
  async login(loginDto: LoginDto, ip: string) {
    console.log('🔵 Login attempt:', { email: loginDto.email, ipAddress: ip });

    const { email, password } = loginDto;

    // Find user
    console.log('🔍 Looking up user...');
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      console.log('❌ User not found:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
      roles: user.userRoles.map((ur) => ur.role.name),
    });

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000 / 60,
      );
      console.log('🔒 Account locked until:', user.lockedUntil);
      throw new UnauthorizedException(
        `Account locked. Try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`,
      );
    }

    // Validate password
    console.log('🔒 Validating password...');
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    console.log('✅ Password valid');

    // Check email verified
    if (!user.emailVerified) {
      console.log('❌ Email not verified');
      throw new UnauthorizedException('Please verify your email first');
    }

    console.log('✅ Email verified');

    // Allow login if email is verified, regardless of DRIVER role status
    // Still allow ADMINs
    const isAdmin = user.userRoles.some((ur) => ur.role.name === 'ADMIN');
    if (!isAdmin && !user.emailVerified) {
      console.log('❌ Email not verified');
      throw new UnauthorizedException('Please verify your email first');
    }
    // Optionally, you can log the role statuses for debugging
    console.log(
      'User role statuses:',
      user.userRoles.map((ur) => `${ur.role.name}:${ur.status}`),
    );

    // Generate JWT tokens
    console.log('🎫 Generating tokens...');
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.userRoles.map((ur) => ur.role.name),
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    console.log('✅ Login successful');

    return {
      user: {
        id: user.id,
        email: user.email,
        emailVerified: user.emailVerified,
        roles: user.userRoles.map((ur) => ur.role.name),
        roleStatuses: user.userRoles.map((ur) => ({
          role: ur.role.name,
          status: ur.status,
        })),
      },
      accessToken,
      refreshToken,
    };
  }

  // Refresh Token
  async refreshToken(refreshToken: string) {
    try {
      console.log('Attempting to verify refresh token...');
      console.log('Using JWT_REFRESH_SECRET:', process.env.JWT_REFRESH_SECRET);
      console.log(
        'Refresh token received:',
        refreshToken.substring(0, 20) + '...',
      );

      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        email: string;
        roles: string[];
      }>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
      });

      console.log('Token verified successfully, payload:', payload);

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      // Check if user has any verified roles
      const hasVerifiedRole = user?.userRoles.some(
        (ur) => ur.status === 'VERIFIED' || ur.role.name === 'ADMIN',
      );

      if (!user || !hasVerifiedRole) {
        console.log('User not found or no verified roles:', user?.id);
        throw new UnauthorizedException('Invalid token');
      }

      const roles = user.userRoles.map((ur) => ur.role.name);
      const tokens = await this.generateTokens(user.id, user.email, roles);

      return tokens;
    } catch (error) {
      console.error('Token verification failed:', error.message);
      console.error('Error name:', error.name);
      console.error('Full error:', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // Forgot Password
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return {
        message: 'If the email exists, a reset code has been sent',
      };
    }

    // Generate reset code
    const verificationCode = this.generateVerificationCode();
    const verificationExpiry = new Date();
    verificationExpiry.setMinutes(verificationExpiry.getMinutes() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationExpiry,
      },
    });

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(email, verificationCode);

    return {
      message: 'If the email exists, a reset code has been sent',
      verificationCode, // Remove in production
    };
  }

  // Reset Password
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, code, newPassword } = resetPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new BadRequestException('Invalid request');
    }

    if (user.verificationCode !== code) {
      throw new BadRequestException('Invalid reset code');
    }

    if (user.verificationExpiry && user.verificationExpiry < new Date()) {
      throw new BadRequestException('Reset code expired');
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verificationCode: null,
        verificationExpiry: null,
      },
    });

    return {
      message: 'Password reset successfully',
    };
  }

  // Resend Verification Code
  async resendVerificationCode(email: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return {
        message: 'If the email exists, a verification code has been sent',
      };
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new code
    const verificationCode = this.generateVerificationCode();
    const verificationExpiry = new Date();
    verificationExpiry.setMinutes(verificationExpiry.getMinutes() + 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationExpiry,
      },
    });

    // Log for debugging
    console.log(
      `[RESEND] Sending verification code to: ${email}, code: ${verificationCode}`,
    );

    await this.emailService.sendVerificationEmail(email, verificationCode);

    return {
      message: 'If the email exists, a verification code has been sent',
      verificationCode, // Remove in production
    };
  }
}
