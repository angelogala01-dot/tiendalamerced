import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { IdentityService } from './identity.service';

@ApiTags('identity')
@Controller('identity')
@UseGuards(SupabaseAuthGuard)
@ApiBearerAuth()
export class IdentityController {
  constructor(private readonly identity: IdentityService) {}

  @Get('dni/:numero')
  dni(@Param('numero') numero: string) {
    return this.identity.lookupDni(numero);
  }

  @Get('ruc/:numero')
  ruc(@Param('numero') numero: string) {
    return this.identity.lookupRuc(numero);
  }
}
