import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { slugify } from '../../shared/utils/string.util';
import { CreateBrandDto, UpdateBrandDto } from './dto/brand.dto';

type DbError = { code?: string; message?: string; details?: string; hint?: string };

@Injectable()
export class BrandsService {
  constructor(@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient) {}

  async findAll() {
    const withSupplier = await this.supabase
      .from('brands')
      .select('*, supplier:suppliers(id, name)')
      .order('name');

    if (!withSupplier.error) return withSupplier.data ?? [];

    const fallback = await this.supabase.from('brands').select('*').order('name');
    if (fallback.error) throw this.toHttp(fallback.error);
    return fallback.data ?? [];
  }

  async create(body: CreateBrandDto) {
    const payload = this.payloadFrom(body);

    const clash = await this.findClash(payload.name, payload.slug);
    if (clash) throw clash;

    const first = await this.supabase.from('brands').insert(payload).select().single();
    if (!first.error) return first.data;

    if (this.isMissingSupplierColumn(first.error) && payload.supplier_id) {
      const { supplier_id: _ignored, ...withoutSupplier } = payload;
      const retry = await this.supabase.from('brands').insert(withoutSupplier).select().single();
      if (retry.error) throw this.toHttp(retry.error);
      return retry.data;
    }

    throw this.toHttp(first.error);
  }

  async update(id: string, body: UpdateBrandDto) {
    const payload = this.payloadFrom(body, true);
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException('No hay cambios para guardar');
    }

    if (payload.name || payload.slug) {
      const clash = await this.findClash(payload.name, payload.slug, id);
      if (clash) throw clash;
    }

    const first = await this.supabase.from('brands').update(payload).eq('id', id).select().single();
    if (!first.error) return first.data;

    if (this.isMissingSupplierColumn(first.error) && 'supplier_id' in payload) {
      const { supplier_id: _ignored, ...withoutSupplier } = payload;
      const retry = await this.supabase
        .from('brands')
        .update(withoutSupplier)
        .eq('id', id)
        .select()
        .single();
      if (retry.error) throw this.toHttp(retry.error, true);
      return retry.data;
    }

    throw this.toHttp(first.error, true);
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('brands').delete().eq('id', id);
    if (error) throw this.toHttp(error);
    return { deleted: true };
  }

  private payloadFrom(body: CreateBrandDto | UpdateBrandDto, partial = false) {
    const payload: {
      name?: string;
      slug?: string;
      logo_url?: string | null;
      supplier_id?: string | null;
      is_active?: boolean;
    } = {};

    if (body.name != null) payload.name = body.name.trim();
    if (body.slug != null || body.name != null) {
      const slugSource = (body.slug ?? body.name ?? '').trim();
      if (slugSource) payload.slug = slugify(slugSource);
    }
    if (body.logo_url !== undefined) payload.logo_url = body.logo_url?.trim() || null;
    if (body.supplier_id !== undefined) payload.supplier_id = body.supplier_id || null;
    if ('is_active' in body && body.is_active !== undefined) payload.is_active = body.is_active;

    if (!partial && !payload.name) {
      throw new BadRequestException('El nombre de la marca es obligatorio');
    }
    if (!partial && !payload.slug) {
      payload.slug = slugify(String(payload.name));
    }

    return payload;
  }

  private async findClash(name?: string, slug?: string, ignoreId?: string) {
    if (slug) {
      const { data } = await this.supabase.from('brands').select('id, slug').eq('slug', slug).maybeSingle();
      if (data && data.id !== ignoreId) {
        return new ConflictException('Ya existe una marca con ese slug. Cambia el nombre o el slug.');
      }
    }
    if (name) {
      const { data } = await this.supabase.from('brands').select('id, name').ilike('name', name).maybeSingle();
      if (data && data.id !== ignoreId) {
        return new ConflictException('Ya existe una marca con ese nombre.');
      }
    }
    return null;
  }

  private isMissingSupplierColumn(error: DbError) {
    const text = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`.toLowerCase();
    return (
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      (text.includes('supplier_id') && (text.includes('column') || text.includes('schema cache')))
    );
  }

  private toHttp(error: DbError, asNotFound = false) {
    const text = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();

    if (error.code === '23505' || text.includes('duplicate')) {
      if (text.includes('slug')) {
        return new ConflictException('Ya existe una marca con ese slug. Cambia el nombre o el slug.');
      }
      if (text.includes('name')) {
        return new ConflictException('Ya existe una marca con ese nombre.');
      }
      return new ConflictException('Ya existe una marca con esos datos.');
    }

    if (error.code === '23503' || text.includes('foreign key')) {
      return new BadRequestException('El proveedor seleccionado no existe. Elige otro o déjalo vacío.');
    }

    if (asNotFound && (error.code === 'PGRST116' || text.includes('0 rows'))) {
      return new NotFoundException('Marca no encontrada');
    }

    return new BadRequestException(
      error.message || 'No se pudo guardar la marca. Revisa los datos e inténtalo de nuevo.',
    );
  }
}
