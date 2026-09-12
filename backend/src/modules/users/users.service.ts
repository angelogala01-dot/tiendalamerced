import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { UserRole } from '../../shared/constants/roles';
import { MailService } from '../mail/mail.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.SUPER_ADMIN]: 'Super Admin',
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.MANAGER]: 'Gerente',
  [UserRole.SELLER]: 'Vendedor',
  [UserRole.WAREHOUSE]: 'Almacenero',
  [UserRole.CUSTOMER]: 'Cliente',
};

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly mail: MailService,
  ) {}

  async findAll() {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .order('full_name');
    if (error) throw error;
    return { data };
  }

  async create(dto: CreateUserDto) {
    const { data: authData, error: authError } = await this.supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: { full_name: dto.full_name, role: dto.role },
      app_metadata: { role: dto.role },
    });

    if (authError) {
      throw new BadRequestException(authError.message);
    }

    const userId = authData.user.id;

    const { data, error } = await this.supabase
      .from('profiles')
      .update({
        full_name: dto.full_name,
        role: dto.role,
        phone: dto.phone,
        is_active: true,
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    const email = dto.email.trim().toLowerCase();
    const isStaff = dto.role !== UserRole.CUSTOMER;
    const loginUrl = isStaff
      ? `${this.mail.adminUrl()}/login`
      : `${this.mail.storefrontUrl()}/login`;

    void this.mail
      .sendAccountCreated(email, {
        userId,
        customerName: dto.full_name?.trim() || data.full_name,
        email,
        roleLabel: ROLE_LABELS[dto.role] ?? dto.role,
        temporaryPassword: dto.password,
        loginUrl,
        isStaff,
      })
      .catch((err) => {
        this.logger.warn(
          `No se pudo enviar alta de cuenta a ${email}: ${err instanceof Error ? err.message : 'fallo'}`,
        );
      });

    return data;
  }

  async updateProfile(id: string, dto: UpdateUserDto) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Usuario no encontrado');
    return data;
  }

  async updateRole(id: string, role: string) {
    const { data: current, error: currentError } = await this.supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', id)
      .maybeSingle();

    if (currentError || !current) throw new NotFoundException('Usuario no encontrado');

    if (
      current.role === 'super_admin' &&
      role !== 'super_admin' &&
      current.is_active !== false
    ) {
      await this.assertNotLastSuperAdmin(id);
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Usuario no encontrado');

    await this.supabase.auth.admin.updateUserById(id, {
      app_metadata: { role },
      user_metadata: { role },
    });

    return data;
  }

  async updateStatus(id: string, isActive: boolean) {
    const { data: current, error: currentError } = await this.supabase
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', id)
      .maybeSingle();

    if (currentError || !current) throw new NotFoundException('Usuario no encontrado');

    if (!isActive && current.role === 'super_admin' && current.is_active !== false) {
      await this.assertNotLastSuperAdmin(id);
    }

    const { data, error } = await this.supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Usuario no encontrado');

    await this.supabase.auth.admin.updateUserById(id, {
      ban_duration: isActive ? 'none' : '876000h',
    });

    return data;
  }

  async remove(id: string, actorId: string) {
    if (id === actorId) {
      throw new ForbiddenException('No puedes eliminar tu propia cuenta');
    }

    const { data: target, error } = await this.supabase
      .from('profiles')
      .select('id, email, role, is_active')
      .eq('id', id)
      .maybeSingle();

    if (error || !target) throw new NotFoundException('Usuario no encontrado');

    if (target.role === 'super_admin' && target.is_active !== false) {
      await this.assertNotLastSuperAdmin(id);
    }

    await this.detachUserRelations(id);

    const { error: authError } = await this.supabase.auth.admin.deleteUser(id);
    if (authError) {
      const { error: profileError } = await this.supabase.from('profiles').delete().eq('id', id);
      if (profileError) {
        throw new BadRequestException(
          authError.message || profileError.message || 'No se pudo eliminar el usuario',
        );
      }
    }

    return { deleted: true, id, email: target.email };
  }

  private async detachUserRelations(userId: string) {
    await this.supabase.from('customers').update({ user_id: null }).eq('user_id', userId);
    await this.supabase.from('notifications').delete().eq('user_id', userId);
    await this.supabase.from('favorites').delete().eq('user_id', userId);
    await this.supabase.from('cart_items').delete().eq('user_id', userId);
    await this.supabase.from('sales').update({ seller_id: null }).eq('seller_id', userId);
    await this.supabase.from('orders').update({ assigned_to: null }).eq('assigned_to', userId);
    await this.supabase
      .from('inventory_movements')
      .update({ created_by: null })
      .eq('created_by', userId);
    await this.supabase
      .from('order_status_history')
      .update({ changed_by: null })
      .eq('changed_by', userId);
  }

  private async assertNotLastSuperAdmin(excludeId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('role', 'super_admin')
      .eq('is_active', true)
      .neq('id', excludeId)
      .limit(1);

    if (error) throw error;
    if (!data?.length) {
      throw new BadRequestException('Debe quedar al menos un super administrador activo');
    }
  }
}
