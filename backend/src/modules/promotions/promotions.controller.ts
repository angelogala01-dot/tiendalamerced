import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminAuth } from '../../common/decorators/staff-auth.decorator';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto, UpdatePromotionDto } from './dto/promotion.dto';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly service: PromotionsService) {}

  @Get()
  findActive() {
    return this.service.findActive();
  }

  @Get('welcome-eligibility')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  welcomeEligibility(@CurrentUser() user: User) {
    return this.service.getWelcomeEligibility(user.id);
  }

  @Get('admin')
  @AdminAuth()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @AdminAuth()
  create(@Body() dto: CreatePromotionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @AdminAuth()
  update(@Param('id') id: string, @Body() dto: UpdatePromotionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @AdminAuth()
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
