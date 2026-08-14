import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StaffAuth } from '../../common/decorators/staff-auth.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@StaffAuth()
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('overview')
  getOverview() {
    return this.service.getOverview();
  }
}
