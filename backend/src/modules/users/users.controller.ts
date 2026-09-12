import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { AdminAuth } from '../../common/decorators/staff-auth.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @AdminAuth()
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
  @ApiBearerAuth()
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.service.remove(id, user.id);
  }
}
