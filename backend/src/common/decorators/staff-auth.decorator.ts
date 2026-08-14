import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Roles } from './roles.decorator';
import { SupabaseAuthGuard } from '../guards/supabase-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { ADMIN_ROLES, STAFF_ROLES, UserRole } from '../../shared/constants/roles';

export function StaffAuth(...roles: UserRole[]) {
  return applyDecorators(
    UseGuards(SupabaseAuthGuard, RolesGuard),
    Roles(...(roles.length ? roles : STAFF_ROLES)),
    ApiBearerAuth(),
  );
}

export function AdminAuth() {
  return StaffAuth(...ADMIN_ROLES);
}
