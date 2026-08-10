import { ApiProperty } from '@nestjs/swagger';
import { CUSTOMER_STATUSES, CustomerStatus } from '../../customers/customer-status';

export class StatusBreakdownDto {
  @ApiProperty({ enum: CUSTOMER_STATUSES }) status!: CustomerStatus;
  @ApiProperty() count!: number;
  @ApiProperty({ description: 'Summed contract value for this status' }) value!: number;
}

export class RevenuePointDto {
  @ApiProperty({ example: '2026-08', description: 'Month in YYYY-MM form' }) month!: string;
  @ApiProperty({ description: 'Contract value added during the month' }) value!: number;
}

export class DashboardSummaryDto {
  @ApiProperty() customers!: number;
  @ApiProperty({ description: 'Total contract value across every status' }) pipeline!: number;
  @ApiProperty() activeAccounts!: number;
  @ApiProperty({ example: 42.9, description: 'Percentage of customers in the ACTIVE status' }) conversionRate!: number;
  @ApiProperty({ type: [StatusBreakdownDto] }) byStatus!: StatusBreakdownDto[];
  @ApiProperty({ type: [RevenuePointDto], description: 'Trailing twelve months' }) revenue!: RevenuePointDto[];
}
