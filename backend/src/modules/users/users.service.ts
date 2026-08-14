import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

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
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ role })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Usuario no encontrado');
    return data;
  }

  async updateStatus(id: string, isActive: boolean) {
    const { data, error } = await this.supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Usuario no encontrado');
    return data;
  }

  async remove(id: string) {
    return this.updateStatus(id, false);
  }
}
