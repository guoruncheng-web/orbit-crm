import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CurrentUser as CurrentUserType } from '../auth/jwt.strategy';
import { CustomersService } from './customers.service';
import {
  CreateCustomerDto,
  CustomerDto,
  CustomerPageDto,
  QueryCustomersDto,
  UpdateCustomerDto,
} from './dto/customer.dto';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Page through the customers of the caller’s organization' })
  list(@CurrentUser() user: CurrentUserType, @Query() query: QueryCustomersDto): Promise<CustomerPageDto> {
    return this.customers.list(user.organizationId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a customer' })
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreateCustomerDto): Promise<CustomerDto> {
    return this.customers.create(user.organizationId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update any subset of a customer’s fields' })
  update(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomerDto,
  ): Promise<CustomerDto> {
    return this.customers.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a customer' })
  remove(@CurrentUser() user: CurrentUserType, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.customers.remove(user.organizationId, id);
  }
}
