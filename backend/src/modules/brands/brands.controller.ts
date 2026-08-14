import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { StaffAuth } from '../../common/decorators/staff-auth.decorator';
import { BrandsService } from './brands.service';

@ApiTags('brands')
@Controller('brands')
export class BrandsController {
  constructor(private readonly service: BrandsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @StaffAuth()
  create(@Body() body: { name: string; slug: string }) {
    return this.service.create(body);
  }

  @Patch(':id')
  @StaffAuth()
  update(@Param('id') id: string, @Body() body: { name?: string; slug?: string; is_active?: boolean }) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @StaffAuth()
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
