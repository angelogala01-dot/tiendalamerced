import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';
import { MonitoringService } from './monitoring.service';

@ApiTags('monitoring')
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}

  @Post('errors')
  reportError(
    @Body()
    body: {
      message: string;
      stack?: string;
      source: 'frontend' | 'admin' | 'backend';
      url?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    },
    @CurrentUser() user?: User,
  ) {
    return this.service.reportError(body, user?.id);
  }

  @Post('errors/auth')
  @UseGuards(SupabaseAuthGuard)
  reportErrorAuth(
    @Body()
    body: {
      message: string;
      stack?: string;
      source: 'frontend' | 'admin' | 'backend';
      url?: string;
      userAgent?: string;
      metadata?: Record<string, unknown>;
    },
    @CurrentUser() user: User,
  ) {
    return this.service.reportError(body, user.id);
  }
}
