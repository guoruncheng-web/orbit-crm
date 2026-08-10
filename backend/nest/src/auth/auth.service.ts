import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthResponseDto, AuthenticatedUserDto, LoginDto, RegisterDto } from './dto/auth.dto';
import type { JwtPayload } from './jwt.strategy';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /** Creates a workspace and its first user in one transaction. */
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const email = dto.email.trim().toLowerCase();

    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash,
        organization: { create: { name: dto.organizationName.trim() } },
      },
      include: { organization: true },
    });

    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.trim().toLowerCase() },
      include: { organization: true },
    });

    // Compare against a dummy hash when the user is missing so that a wrong
    // email and a wrong password take the same amount of time to reject.
    const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv';
    const matches = await bcrypt.compare(dto.password, hash);

    if (!user || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.issueToken(user);
  }

  /**
   * Resolves the principal against the database rather than trusting the token
   * alone. A token outlives the row it describes — a reaped demo workspace, a
   * deleted account — and the client needs to be told to sign in again instead
   * of being shown an empty dashboard.
   */
  async currentUser(userId: string): Promise<AuthenticatedUserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedException('This session is no longer valid');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      organizationId: user.organizationId,
      organizationName: user.organization.name,
    };
  }

  /** Public so the demo module can hand a token to a freshly minted workspace. */
  async issueToken(user: {
    id: string;
    email: string;
    name: string;
    organizationId: string;
    organization: { name: string };
  }): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      org: user.organizationId,
      orgName: user.organization.name,
    };

    return {
      accessToken: await this.jwt.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        organizationName: user.organization.name,
      },
    };
  }
}
