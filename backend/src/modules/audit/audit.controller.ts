import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuth } from '../../common/decorators/staff-auth.decorator';
import { AuditService } from './audit.service';

@ApiTags('audit')
@Controller('audit')
@AdminAuth()
export class AuditController {
  constructor(private readonly service: AuditService) {}

  @Get('logs')
  findAll(
    @Query('module') module?: string,
    @Query('userId') userId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findAll({ module, userId, page, limit });
  }
}
