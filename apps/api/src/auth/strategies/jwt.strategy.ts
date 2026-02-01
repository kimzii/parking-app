import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service';
import { JwtPayload, AuthUser } from '../types/user.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'dev-secret-key-change-in-production',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    // Find user with roles
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

    if (user.status === 'BLOCKED') {
      throw new UnauthorizedException('Account blocked');
    }

    // Return user object (available as req.user)
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      roles: user.userRoles.map((ur) => ur.role.name),
    };
  }
}
