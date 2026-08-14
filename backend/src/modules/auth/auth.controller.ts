import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  async me(@CurrentUser() user: User) {
    const profile = await this.authService.getProfile(user.id);
    return { user, profile };
  }

  @Post('complete-profile')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  completeProfile(
    @CurrentUser() user: User,
    @Body() body: { full_name?: string; phone?: string },
  ) {
    return this.authService.completeProfile(user.id, body);
  }
}
