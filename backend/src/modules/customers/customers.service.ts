import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { sanitizeSearchTerm } from '../../shared/utils/string.util';
import { MailService } from '../mail/mail.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';

@Injectable()
export class CustomersService {
  private readonly logger = new Logger(CustomersService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly mail: MailService,
  ) {}

  async findAll(search?: string) {
    let query = this.supabase.from('customers').select('*').order('full_name');
    if (search) {
      const term = sanitizeSearchTerm(search);
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return { data };
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('customers')
      .select('*, sales:sales(*), orders:orders(*)')
      .eq('id', id)
      .single();
    if (error) throw new NotFoundException('Cliente no encontrado');
    return data;
  }

  async create(dto: CreateCustomerDto) {
    const email = dto.email?.trim().toLowerCase() || null;
    const account = email ? await this.provisionStorefrontAccount(email, dto.full_name) : null;

    const { data, error } = await this.supabase
      .from('customers')
      .insert({
        full_name: dto.full_name,
        email,
        phone: dto.phone,
        document_type: dto.document_type,
        document_number: dto.document_number,
        address: dto.address,
        city: dto.city,
        notes: dto.notes ?? (email ? 'Alta desde admin — cuenta de tienda' : 'Alta desde admin'),
        user_id: account?.userId ?? null,
      })
      .select()
      .single();

    if (error) {
      if (account?.userId && /user_id|duplicate|unique/i.test(error.message)) {
        const retry = await this.supabase
          .from('customers')
          .insert({
            full_name: dto.full_name,
            email,
            phone: dto.phone,
            document_type: dto.document_type,
            document_number: dto.document_number,
            address: dto.address,
            city: dto.city,
            notes: dto.notes ?? 'Alta desde admin',
            user_id: null,
          })
          .select()
          .single();
        if (retry.error) throw retry.error;
        if (email) await this.notifyCustomerCreated(retry.data, email, account);
        return retry.data;
      }
      throw error;
    }

    if (email) await this.notifyCustomerCreated(data, email, account);
    return data;
  }

  async update(id: string, dto: UpdateCustomerDto) {
    const { data, error } = await this.supabase
      .from('customers')
      .update(dto)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new NotFoundException('Cliente no encontrado');
    return data;
  }

  /** Elimina el cliente. Si tiene pedidos/ventas, anonimiza en lugar de borrar el historial. */
  async remove(id: string) {
    const { data: customer, error } = await this.supabase
      .from('customers')
      .select('id, full_name, email, user_id')
      .eq('id', id)
      .maybeSingle();

    if (error || !customer) throw new NotFoundException('Cliente no encontrado');

    const [{ count: orderCount }, { count: saleCount }] = await Promise.all([
      this.supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id),
      this.supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', id),
    ]);

    const hasHistory = (orderCount ?? 0) > 0 || (saleCount ?? 0) > 0;

    if (hasHistory) {
      const { data, error: updateError } = await this.supabase
        .from('customers')
        .update({
          is_active: false,
          full_name: `Cliente eliminado`,
          email: null,
          phone: null,
          document_number: null,
          notes: `Anonimizado. Antes: ${customer.full_name}${customer.email ? ` <${customer.email}>` : ''}`,
          user_id: null,
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw new BadRequestException(updateError.message);

      if (customer.user_id) {
        await this.supabase.auth.admin.deleteUser(customer.user_id);
      }

      return { deleted: false, anonymized: true, data };
    }

    const authUserId = customer.user_id as string | null;

    const { error: deleteError } = await this.supabase.from('customers').delete().eq('id', id);
    if (deleteError) {
      throw new BadRequestException(deleteError.message);
    }

    if (authUserId) {
      await this.supabase.auth.admin.deleteUser(authUserId);
    }

    return { deleted: true, anonymized: false, id };
  }

  private async provisionStorefrontAccount(email: string, fullName: string) {
    const temporaryPassword = this.generateTempPassword();
    const { data, error } = await this.supabase.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim(), role: 'customer' },
      app_metadata: { role: 'customer' },
    });

    if (!error && data.user?.id) {
      return { userId: data.user.id, temporaryPassword, isNew: true };
    }

    if (error && this.isDuplicateAuthError(error.message)) {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profile?.id) {
        const { data: linked } = await this.supabase
          .from('customers')
          .select('id')
          .eq('user_id', profile.id)
          .maybeSingle();
        return { userId: linked ? null : profile.id, temporaryPassword: null, isNew: false };
      }
    }

    if (error) {
      this.logger.warn(`No se pudo crear cuenta de tienda para ${email}: ${error.message}`);
    }

    return { userId: null, temporaryPassword: null, isNew: false };
  }

  private async notifyCustomerCreated(
    customer: { id: string; full_name?: string | null },
    email: string,
    account: { userId: string | null; temporaryPassword: string | null; isNew: boolean } | null,
  ) {
    const storefront = this.mail.storefrontUrl();
    const loginUrl = `${storefront}/login`;
    const name = customer.full_name;

    try {
      if (account?.temporaryPassword) {
        await this.mail.sendAccountCreated(email, {
          userId: account.userId || customer.id,
          customerName: name,
          email,
          roleLabel: 'Cliente',
          temporaryPassword: account.temporaryPassword,
          loginUrl,
          isStaff: false,
        });
        return;
      }

      await this.mail.sendWelcome(email, {
        userId: customer.id,
        customerName: name,
        email,
        catalogUrl: `${storefront}/catalogo`,
        loginUrl,
      });
    } catch (err) {
      this.logger.warn(
        `No se pudo enviar alta de cliente a ${email}: ${err instanceof Error ? err.message : 'fallo'}`,
      );
    }
  }

  private isDuplicateAuthError(message: string) {
    const text = message.toLowerCase();
    return (
      text.includes('already') ||
      text.includes('registered') ||
      text.includes('exists') ||
      text.includes('duplicate')
    );
  }

  private generateTempPassword() {
    return `Lm.${randomBytes(6).toString('base64url')}9a`;
  }
}
