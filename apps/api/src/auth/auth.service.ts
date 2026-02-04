/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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
    const { email, password, role } = registerDto;

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
    verificationExpiry.setMinutes(
      verificationExpiry.getMinutes() +
        parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || '15'),
    );

    // Create user with role
    const roleRecord = await this.prisma.role.findUnique({
      where: { name: role },
    });

    if (!roleRecord) {
      throw new BadRequestException('Invalid role');
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        verificationCode,
        verificationExpiry,
        status: UserStatus.PENDING,
        userRoles: {
          create: {
            roleId: roleRecord.id,
          },
        },
      },
    });

    // TODO: Send verification email
    console.log(`Verification code for ${email}: ${verificationCode}`);

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
  async login(loginDto: LoginDto, ipAddress?: string) {
    const { email, password } = loginDto;

    // Find user with roles
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
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 1000 / 60,
      );
      throw new UnauthorizedException(
        `Account locked. Try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`,
      );
    }

    // Check password
    const isPasswordValid = await this.comparePassword(password, user.password);
    if (!isPasswordValid) {
      // Increment failed attempts
      const attempts = user.loginAttempts + 1;
      const maxAttempts = 5;
      const lockDuration = attempts >= maxAttempts ? 30 : 0; // Lock for 30 min after 5 attempts

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          loginAttempts: attempts,
          lockedUntil:
            lockDuration > 0
              ? new Date(Date.now() + lockDuration * 60000)
              : null,
        },
      });

      const attemptsRemaining = Math.max(0, maxAttempts - attempts);
      if (lockDuration > 0) {
        throw new UnauthorizedException(
          `Too many failed attempts. Account locked for ${lockDuration} minutes`,
        );
      }

      throw new UnauthorizedException(
        `Invalid credentials. ${attemptsRemaining} attempt${attemptsRemaining !== 1 ? 's' : ''} remaining`,
      );
    }

    // Check if email verified
    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    // Check if user is blocked
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Your account has been blocked');
    }

    // Reset login attempts and update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    // Generate tokens
    const roles = user.userRoles.map((ur) => ur.role.name);
    const tokens = await this.generateTokens(user.id, user.email, roles);

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        status: user.status,
        roles,
      },
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

      if (!user || user.status === UserStatus.BLOCKED) {
        console.log('User not found or blocked:', user);
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
    verificationExpiry.setMinutes(
      verificationExpiry.getMinutes() +
        parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || '15'),
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationExpiry,
      },
    });

    // TODO: Send reset email
    console.log(`Password reset code for ${email}: ${verificationCode}`);

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
    verificationExpiry.setMinutes(
      verificationExpiry.getMinutes() +
        parseInt(process.env.VERIFICATION_CODE_EXPIRY_MINUTES || '15'),
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        verificationCode,
        verificationExpiry,
      },
    });

    // TODO: Send email
    console.log(`New verification code for ${email}: ${verificationCode}`);

    return {
      message: 'If the email exists, a verification code has been sent',
      verificationCode, // Remove in production
    };
  }
}
