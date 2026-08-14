import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StaffAuth } from '../../common/decorators/staff-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';
import { InventoryService } from './inventory.service';

@ApiTags('inventory')
@Controller('inventory')
@StaffAuth()
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('movements')
  getMovements(@Query('productId') productId?: string) {
    return this.service.getMovements(productId);
  }

  @Post('movements')
  registerMovement(
    @Body()
    body: {
      product_id: string;
      movement_type: 'entry' | 'exit' | 'adjustment';
      quantity: number;
      notes?: string;
    },
    @CurrentUser() user: User,
  ) {
    return this.service.registerMovement(body, user.id);
  }
}
