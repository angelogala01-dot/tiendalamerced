import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StaffAuth } from '../../common/decorators/staff-auth.decorator';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
@StaffAuth()
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('top-products')
  getTopProducts() {
    return this.service.getTopProducts();
  }
}
