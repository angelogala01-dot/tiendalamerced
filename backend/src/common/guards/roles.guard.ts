import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Inject } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../shared/constants/roles';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles?.length) return true;

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    if (!userId) throw new ForbiddenException('Acceso denegado');

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', userId)
      .single();

    if (!profile?.is_active) throw new ForbiddenException('Usuario inactivo');

    if (!requiredRoles.includes(profile.role as UserRole)) {
      throw new ForbiddenException('No tienes permisos para esta acción');
    }

    request.profile = profile;
    return true;
  }
}
