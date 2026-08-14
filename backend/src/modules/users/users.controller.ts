import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminAuth, StaffAuth } from '../../common/decorators/staff-auth.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @StaffAuth()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @AdminAuth()
  create(@Body() dto: CreateUserDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @AdminAuth()
  updateProfile(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.service.updateProfile(id, dto);
  }

  @Patch(':id/role')
  @AdminAuth()
  updateRole(@Param('id') id: string, @Body() body: { role: string }) {
    return this.service.updateRole(id, body.role);
  }

  @Patch(':id/status')
  @AdminAuth()
  updateStatus(@Param('id') id: string, @Body() body: { is_active: boolean }) {
    return this.service.updateStatus(id, body.is_active);
  }

  @Delete(':id')
  @AdminAuth()
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
