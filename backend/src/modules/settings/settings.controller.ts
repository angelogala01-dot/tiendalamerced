import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuth } from '../../common/decorators/staff-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
@AdminAuth()
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':key')
  findOne(@Param('key') key: string) {
    return this.service.findOne(key);
  }

  @Put(':key')
  upsert(
    @Param('key') key: string,
    @Body() body: { value: Record<string, unknown>; description?: string },
    @CurrentUser() user: User,
  ) {
    return this.service.upsert(key, body.value, user.id, body.description);
  }
}
