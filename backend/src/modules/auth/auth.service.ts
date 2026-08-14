import { Inject, Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { PromotionsService } from '../promotions/promotions.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly promotionsService: PromotionsService,
  ) {}

  async getProfile(userId: string) {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data;
  }

  async completeProfile(
    userId: string,
    body: { full_name?: string; phone?: string },
  ) {
    const updates: Record<string, string | null> = {};
    if (body.full_name?.trim()) updates.full_name = body.full_name.trim();
    if (body.phone !== undefined) updates.phone = body.phone.trim() || null;

    if (Object.keys(updates).length) {
      const { error: profileError } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      if (profileError) throw profileError;
    }

    const profile = await this.getProfile(userId);

    const { data: existingCustomer } = await this.supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingCustomer) {
      const { error: customerError } = await this.supabase.from('customers').insert({
        user_id: userId,
        full_name: profile.full_name || 'Cliente',
        email: profile.email,
        phone: profile.phone,
        notes: 'Registro web — elegible promoción bienvenida',
      });

      if (customerError) throw customerError;
    }

    const welcome = await this.promotionsService.getWelcomeEligibility(userId);

    return {
      profile,
      welcome,
    };
  }

  async register(body: RegisterDto) {
    const email = body.email.trim().toLowerCase();

    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name?.trim() ?? '',
        role: 'customer',
      },
      app_metadata: { role: 'customer' },
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (
        message.includes('already') ||
        message.includes('registered') ||
        message.includes('exists') ||
        message.includes('duplicate')
      ) {
        throw new ConflictException('Este correo ya está registrado. Inicia sesión.');
      }
      throw new BadRequestException(error.message);
    }

    const result = await this.completeProfile(data.user.id, {
      full_name: body.full_name,
      phone: body.phone,
    });

    return {
      user_id: data.user.id,
      email,
      ...result,
    };
  }
}
