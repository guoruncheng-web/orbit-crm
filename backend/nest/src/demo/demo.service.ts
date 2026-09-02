import { randomUUID } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../auth/auth.service';
import { AuthResponseDto } from '../auth/dto/auth.dto';
import { PrismaService } from '../prisma/prisma.service';
import { DEMO_ORGANIZATION_NAME, DEMO_OWNER_NAME, buildDemoCustomerRows } from './demo-dataset';

/** How long a visitor's workspace survives before it is reaped. */
const SANDBOX_TTL_HOURS = 24;

/**
 * Ceiling on live sandboxes. New sessions are refused at the ceiling instead
 * of evicting an existing visitor's still-valid workspace.
 */
const MAX_LIVE_SANDBOXES = 200;

@Injectable()
export class DemoService {
  private readonly logger = new Logger(DemoService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /**
   * Mints a private workspace pre-filled with the sample book of business, and
   * signs the visitor into it.
   *
   * Every visitor gets their own tenant rather than sharing one demo login, so
   * deleting or renaming things only affects the person doing it — the next
   * visitor still lands on a complete dashboard. It also puts the tenant
   * boundary on display: two browsers hitting the demo at the same time see
   * entirely separate data.
   */
  async createSandbox(): Promise<AuthResponseDto> {
    await this.reap();

    const live = await this.prisma.organization.count({ where: { isDemo: true } });
    if (live >= MAX_LIVE_SANDBOXES) {
      throw new HttpException('The public demo is at capacity. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    }

    const id = randomUUID();

    const user = await this.prisma.user.create({
      data: {
        email: `demo-${id}@sandbox.orbitcrm.app`,
        name: DEMO_OWNER_NAME,
        // Nobody ever signs in with this; the caller is handed a token directly.
        // It is still hashed so the column holds nothing password-shaped.
        passwordHash: await bcrypt.hash(randomUUID(), 10),
        organization: { create: { name: DEMO_ORGANIZATION_NAME, isDemo: true } },
      },
      include: { organization: true },
    });

    await this.prisma.customer.createMany({
      data: buildDemoCustomerRows(user.organizationId),
    });

    return this.auth.issueToken(user);
  }

  /**
   * Deletes expired sandboxes. Runs inline on each request instead of on a schedule: the
   * Hobby plan allows one cron trigger a day, which is far too coarse, and the
   * work is a single indexed delete.
   *
   * `organizations` cascades to `users` and `customers`, so one statement is
   * enough to remove a whole tenant.
   */
  private async reap(): Promise<void> {
    const cutoff = new Date(Date.now() - SANDBOX_TTL_HOURS * 60 * 60 * 1000);

    try {
      const { count } = await this.prisma.organization.deleteMany({
        where: { isDemo: true, createdAt: { lt: cutoff } },
      });

      if (count > 0) {
        this.logger.log(`Reaped ${count} expired demo workspace(s)`);
      }

    } catch (error) {
      // Cleanup failing is not a reason to deny someone a demo.
      this.logger.error('Demo workspace cleanup failed', error as Error);
    }
  }
}
