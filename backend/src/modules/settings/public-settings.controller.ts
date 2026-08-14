import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@Controller('settings')
export class PublicSettingsController {
  constructor(private readonly service: SettingsService) {}

  @Get('store')
  getStoreSettings() {
    return this.service.getStoreSettings();
  }
}
