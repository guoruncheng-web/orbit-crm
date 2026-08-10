import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Customer } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerStatus } from './customer-status';
import { CreateCustomerDto, CustomerDto, CustomerPageDto, QueryCustomersDto } from './dto/customer.dto';

const DEFAULT_PAGE_SIZE = 10;

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, query: QueryCustomersDto): Promise<CustomerPageDto> {
    const page = query.page ?? 0;
    const size = query.size ?? DEFAULT_PAGE_SIZE;

    // Every clause is anchored on organizationId, so a row from another tenant
    // can never enter the result set regardless of the other filters.
    const where: Prisma.CustomerWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { company: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, totalElements] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: page * size,
        take: size,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      content: rows.map(toDto),
      totalElements,
      totalPages: Math.ceil(totalElements / size),
      number: page,
      size,
    };
  }

  async create(organizationId: string, dto: CreateCustomerDto): Promise<CustomerDto> {
    const customer = await this.prisma.customer.create({
      data: {
        organizationId,
        name: dto.name.trim(),
        company: dto.company.trim(),
        email: dto.email.trim().toLowerCase(),
        status: dto.status,
        value: new Prisma.Decimal(dto.value),
        lastContact: today(),
      },
    });

    return toDto(customer);
  }

  async changeStatus(organizationId: string, id: string, status: CustomerStatus): Promise<CustomerDto> {
    // updateMany rather than update, so the organizationId is part of the WHERE
    // clause instead of a check performed after the row is already loaded.
    const { count } = await this.prisma.customer.updateMany({
      where: { id, organizationId },
      data: { status, lastContact: today() },
    });

    if (count === 0) {
      throw new NotFoundException('Customer not found');
    }

    return toDto(await this.prisma.customer.findUniqueOrThrow({ where: { id } }));
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const { count } = await this.prisma.customer.deleteMany({ where: { id, organizationId } });

    if (count === 0) {
      throw new NotFoundException('Customer not found');
    }
  }
}

/** Midnight UTC today, matching the `date` column's lack of a time component. */
function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function toDto(customer: Customer): CustomerDto {
  return {
    id: customer.id,
    name: customer.name,
    company: customer.company,
    email: customer.email,
    status: customer.status as CustomerStatus,
    // Decimal serialises to a string over JSON; the client wants a number.
    value: customer.value.toNumber(),
    lastContact: customer.lastContact.toISOString().slice(0, 10),
    createdAt: customer.createdAt.toISOString(),
  };
}
