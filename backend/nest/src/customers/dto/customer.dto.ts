import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, MaxLength, Min, Max } from 'class-validator';
import { CUSTOMER_STATUSES, CustomerStatus } from '../customer-status';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Jamie Chen', maxLength: 120 })
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'Acme Inc.', maxLength: 160 })
  @IsNotEmpty()
  @MaxLength(160)
  company!: string;

  @ApiProperty({ example: 'jamie@acme.com', maxLength: 255 })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ enum: CUSTOMER_STATUSES })
  @IsIn(CUSTOMER_STATUSES)
  status!: CustomerStatus;

  @ApiProperty({ example: 12000, minimum: 0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  value!: number;
}

export class UpdateStatusDto {
  @ApiProperty({ enum: CUSTOMER_STATUSES })
  @IsIn(CUSTOMER_STATUSES)
  status!: CustomerStatus;
}

export class QueryCustomersDto {
  @ApiPropertyOptional({ description: 'Case-insensitive match against name, company or email' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ enum: CUSTOMER_STATUSES })
  @IsOptional()
  @IsIn(CUSTOMER_STATUSES)
  status?: CustomerStatus;

  @ApiPropertyOptional({ default: 0, minimum: 0, description: 'Zero-based page index' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  page?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  size?: number;
}

export class CustomerDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() company!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: CUSTOMER_STATUSES }) status!: CustomerStatus;
  @ApiProperty({ example: 12000 }) value!: number;
  @ApiProperty({ example: '2026-08-09' }) lastContact!: string;
  @ApiProperty() createdAt!: string;
}

export class CustomerPageDto {
  @ApiProperty({ type: [CustomerDto] }) content!: CustomerDto[];
  @ApiProperty() totalElements!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty({ description: 'Zero-based index of the returned page' }) number!: number;
  @ApiProperty() size!: number;
}
