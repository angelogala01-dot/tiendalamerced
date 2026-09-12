import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { OrdersAuth } from '../../common/decorators/staff-auth.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { DeliverOrderDto } from './dto/deliver-order.dto';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Get()
  @OrdersAuth()
  findAll(@Query('status') status?: string) {
    return this.service.findAll(status);
  }

  @Get('my')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  findMy(@CurrentUser() user: User) {
    return this.service.findMyOrdersByUser(user.id);
  }

  @Post()
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateOrderDto, @CurrentUser() user: User) {
    return this.service.create(dto, user.id);
  }

  @Get('track/:orderNumber')
  track(@Param('orderNumber') orderNumber: string) {
    return this.service.findByNumber(orderNumber);
  }

  @Get('deliveries')
  @OrdersAuth()
  findDeliveries() {
    return this.service.findDeliveries();
  }

  @Post(':id/comprobante')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  emitMine(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() body: { kind?: 'boleta' | 'factura'; document_type?: string; document_number?: string; legal_name?: string },
  ) {
    return this.service.emitForCustomer(id, user.id, body);
  }

  @Get(':id')
  @OrdersAuth()
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  @OrdersAuth()
  updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; notes?: string },
    @CurrentUser() user: User,
  ) {
    return this.service.updateStatus(id, body.status, body.notes, user.id);
  }

  @Post(':id/deliver')
  @OrdersAuth()
  deliver(
    @Param('id') id: string,
    @Body() dto: DeliverOrderDto,
    @CurrentUser() user: User,
  ) {
    return this.service.deliver(id, dto, user.id);
  }
}
