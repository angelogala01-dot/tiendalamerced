import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SalesAuth } from '../../common/decorators/staff-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';
import { BillingService } from './billing.service';
import { EmitInvoiceDto } from './dto/emit-invoice.dto';

@ApiTags('billing')
@Controller('billing')
@SalesAuth()
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get()
  list() {
    return this.service.list();
  }

  @Get('order/:orderId')
  byOrder(@Param('orderId') orderId: string) {
    return this.service.findByOrder(orderId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('emit')
  emit(@Body() dto: EmitInvoiceDto, @CurrentUser() user: User) {
    return this.service.emit(dto, user.id);
  }
}
