import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserStatus } from '@prisma/client';

interface JwtPayload {
  sub: string;
  email: string;
  roles: string[];
}

interface ValidatedUser {
  userId: string;
  email: string;
  status: UserStatus;
  roles: string[];
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dev-secret-key',
    });
  }

  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    // Get user from database
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

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Only block BLOCKED users, allow PENDING and APPROVED
    if (user.status === UserStatus.BLOCKED) {
      throw new UnauthorizedException('Your account has been blocked');
    }

    return {
      userId: user.id,
      email: user.email,
      status: user.status,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
