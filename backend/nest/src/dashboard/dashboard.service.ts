import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CUSTOMER_STATUSES, CustomerStatus } from '../customers/customer-status';
import { DashboardSummaryDto, RevenuePointDto, StatusBreakdownDto } from './dto/dashboard.dto';

const MONTHS_OF_HISTORY = 12;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(organizationId: string): Promise<DashboardSummaryDto> {
    const [grouped, revenue] = await Promise.all([
      this.prisma.customer.groupBy({
        by: ['status'],
        where: { organizationId },
        _count: { _all: true },
        _sum: { value: true },
      }),
      this.monthlyRevenue(organizationId),
    ]);

    const byStatus: StatusBreakdownDto[] = CUSTOMER_STATUSES.map((status) => {
      const row = grouped.find((entry) => entry.status === status);
      return {
        status,
        count: row?._count._all ?? 0,
        value: row?._sum.value?.toNumber() ?? 0,
      };
    });

    const customers = byStatus.reduce((total, row) => total + row.count, 0);
    const pipeline = byStatus.reduce((total, row) => total + row.value, 0);
    const active = byStatus.find((row) => row.status === ('ACTIVE' satisfies CustomerStatus));

    return {
      customers,
      pipeline,
      activeAccounts: active?.count ?? 0,
      // Share of the book that has converted from lead to active.
      conversionRate: customers === 0 ? 0 : round((active?.count ?? 0) / customers * 100),
      byStatus,
      revenue,
    };
  }

  /**
   * Pipeline value added per month for the last year. Generated from a series so
   * that months without any customers still appear as zero rather than being
   * dropped, which would misalign the chart's x-axis.
   */
  private async monthlyRevenue(organizationId: string): Promise<RevenuePointDto[]> {
    const rows = await this.prisma.$queryRaw<{ month: Date; total: Prisma.Decimal }[]>`
      select
        month_start as month,
        coalesce(sum(c.value), 0) as total
      from generate_series(
        date_trunc('month', now()) - interval '${Prisma.raw(String(MONTHS_OF_HISTORY - 1))} months',
        date_trunc('month', now()),
        interval '1 month'
      ) as month_start
      left join customers c
        on c.organization_id = ${organizationId}::uuid
       and date_trunc('month', c.created_at) = month_start
      group by month_start
      order by month_start
    `;

    return rows.map((row) => ({
      month: row.month.toISOString().slice(0, 7),
      value: Number(row.total),
    }));
  }
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
