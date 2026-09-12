import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { PromotionsService } from '../promotions/promotions.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly promotionsService: PromotionsService,
    private readonly mail: MailService,
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
    if (body.phone !== undefined) {
      const phone = body.phone.trim().replace(/\D/g, '');
      if (phone && !/^9\d{8}$/.test(phone)) {
        throw new BadRequestException('El celular debe tener 9 dígitos y empezar con 9');
      }
      updates.phone = phone || null;
    }

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

    const storefront = this.mail.storefrontUrl();
    void this.mail
      .sendWelcome(email, {
        userId: data.user.id,
        customerName: body.full_name?.trim() || result.profile?.full_name,
        email,
        catalogUrl: `${storefront}/catalogo`,
        loginUrl: `${storefront}/login`,
      })
      .catch((err) => {
        this.logger.warn(
          `No se pudo enviar bienvenida a ${email}: ${err instanceof Error ? err.message : 'fallo'}`,
        );
      });

    return {
      user_id: data.user.id,
      email,
      ...result,
    };
  }

  /**
   * Genera el enlace de recuperación en Supabase y lo envía con Resend.
   * Siempre responde igual para no filtrar si el correo existe.
   */
  async requestPasswordReset(body: ForgotPasswordDto) {
    const email = body.email.trim().toLowerCase();
    const storefront = this.mail.storefrontUrl();
    const redirectTo = `${storefront}/actualizar-contrasena`;

    try {
      const { data, error } = await this.supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo },
      });

      if (error) {
        this.logger.warn(`generateLink recovery (${email}): ${error.message}`);
        return this.forgotPasswordResponse();
      }

      const actionLink = data.properties?.action_link;
      const userId = data.user?.id;
      if (!actionLink || !userId) {
        this.logger.warn(`generateLink sin action_link para ${email}`);
        return this.forgotPasswordResponse();
      }

      const resetUrl = this.withRedirectTo(actionLink, redirectTo);
      const fullName =
        (typeof data.user?.user_metadata?.full_name === 'string'
          ? data.user.user_metadata.full_name
          : null) || null;

      await this.mail.sendPasswordReset(email, {
        userId,
        requestId: randomUUID(),
        customerName: fullName,
        email,
        resetUrl,
        expiryHours: 1,
      });
    } catch (err) {
      this.logger.warn(
        `Error en recuperación de contraseña (${email}): ${err instanceof Error ? err.message : 'fallo'}`,
      );
    }

    return this.forgotPasswordResponse();
  }

  private forgotPasswordResponse() {
    return {
      ok: true,
      message:
        'Si el correo está registrado, te enviamos un enlace para restablecer la contraseña.',
    };
  }

  private withRedirectTo(actionLink: string, redirectTo: string) {
    try {
      const url = new URL(actionLink);
      url.searchParams.set('redirect_to', redirectTo);
      return url.toString();
    } catch {
      return actionLink;
    }
  }
}
