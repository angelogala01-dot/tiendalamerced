import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { buildProductImagePublicUrl } from '../../shared/utils/product-image.util';
import { normalizeRelation } from '../../shared/utils/relation.util';
import { formatSku, isValidSkuFormat } from '../../shared/utils/sku.util';
import { slugify, sanitizeSearchTerm } from '../../shared/utils/string.util';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  private readonly supabaseUrl: string;

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly config: ConfigService,
  ) {
    this.supabaseUrl = this.config.getOrThrow<string>('SUPABASE_URL').trim();
  }

  private normalizeProduct<T extends Record<string, unknown>>(product: T) {
    const brand = normalizeRelation(product.brand as never);
    const category = normalizeRelation(product.category as never);
    const rawImages = (product.images as Array<{ url?: string; storage_path?: string }>) ?? [];
    const images = rawImages.map((img) => ({
      ...img,
      url: buildProductImagePublicUrl(this.supabaseUrl, img.storage_path, img.url),
    }));

    return { ...product, brand, category, images };
  }

  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = slugify(name) || 'producto';
    let candidate = base;
    let counter = 1;

    while (true) {
      let query = this.supabase.from('products').select('id').eq('slug', candidate);
      if (excludeId) query = query.neq('id', excludeId);
      const { data } = await query.maybeSingle();
      if (!data) return candidate;
      candidate = `${base}-${counter++}`;
    }
  }

  private async assertSkuAvailable(sku: string, excludeId?: string) {
    let query = this.supabase.from('products').select('id').eq('sku', sku.trim());
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();
    if (data) {
      throw new BadRequestException(`El SKU "${sku}" ya está en uso. Elija otro código.`);
    }
  }

  async suggestSku(categoryId: string, brandId: string, excludeId?: string) {
    const [{ data: category }, { data: brand }] = await Promise.all([
      this.supabase.from('categories').select('slug').eq('id', categoryId).single(),
      this.supabase.from('brands').select('slug').eq('id', brandId).single(),
    ]);

    if (!category || !brand) {
      throw new BadRequestException('Categoría y marca son requeridas para generar el SKU');
    }

    let sequence = 1;
    let sku = formatSku(category.slug, brand.slug, sequence);

    while (true) {
      let query = this.supabase.from('products').select('id').eq('sku', sku);
      if (excludeId) query = query.neq('id', excludeId);
      const { data: existing } = await query.maybeSingle();
      if (!existing) break;
      sequence += 1;
      sku = formatSku(category.slug, brand.slug, sequence);
      if (sequence > 9999) {
        throw new BadRequestException('No se pudo generar un SKU único');
      }
    }

    return { sku, sequence };
  }

  async checkSkuAvailable(sku: string, excludeId?: string) {
    const normalized = sku.trim().toUpperCase();
    if (!isValidSkuFormat(normalized)) {
      return { available: false, reason: 'Formato de SKU inválido. Use CAT-0001-MARC' };
    }

    let query = this.supabase.from('products').select('id').eq('sku', normalized);
    if (excludeId) query = query.neq('id', excludeId);
    const { data } = await query.maybeSingle();

    return { available: !data, sku: normalized };
  }

  async findAll(params?: {
    search?: string;
    categoryId?: string;
    brandId?: string;
    page?: number;
    limit?: number;
    lite?: boolean;
    activeOnly?: boolean;
  }) {
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = params?.lite
      ? this.supabase
          .from('products')
          .select(
            'id, sku, name, slug, sale_price, cost_price, stock_quantity, min_stock, is_active, category_id, brand_id, created_at, category:categories(id, name, slug), brand:brands(id, name, slug), images:product_images(id, url, storage_path, is_primary)',
            { count: 'exact' },
          )
          .order('created_at', { ascending: false })
          .range(from, to)
      : this.supabase
          .from('products')
          .select('*, category:categories(*), brand:brands(*), images:product_images(*)', {
            count: 'exact',
          })
          .order('created_at', { ascending: false })
          .range(from, to);

    if (params?.search) {
      const term = sanitizeSearchTerm(params.search);
      query = query.or(`name.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%`);
    }
    if (params?.categoryId) query = query.eq('category_id', params.categoryId);
    if (params?.brandId) query = query.eq('brand_id', params.brandId);
    if (params?.activeOnly) query = query.eq('is_active', true);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: (data ?? []).map((p) => this.normalizeProduct(p)),
      total: count,
      page,
      limit,
    };
  }

  async findOne(idOrSlug: string) {
    const select =
      '*, category:categories(*), brand:brands(*), images:product_images(*)';
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );

    const query = this.supabase.from('products').select(select);
    const { data, error } = isUuid
      ? await query.eq('id', idOrSlug).maybeSingle()
      : await query.eq('slug', idOrSlug).maybeSingle();

    if (error || !data) throw new NotFoundException('Producto no encontrado');
    return this.normalizeProduct(data);
  }

  async create(dto: CreateProductDto) {
    if (!dto.category_id || !dto.brand_id) {
      throw new BadRequestException('Categoría y marca son obligatorias');
    }

    const sku = dto.sku.trim().toUpperCase();
    if (!isValidSkuFormat(sku)) {
      throw new BadRequestException('Formato de SKU inválido. Use CAT-0001-MARC');
    }
    await this.assertSkuAvailable(sku);

    const slug = dto.slug?.trim() || (await this.generateUniqueSlug(dto.name));
    const { data, error } = await this.supabase
      .from('products')
      .insert({ ...dto, sku, slug })
      .select('*, category:categories(*), brand:brands(*), images:product_images(*)')
      .single();

    if (error) throw error;
    return this.normalizeProduct(data);
  }

  async update(id: string, dto: UpdateProductDto) {
    if (dto.sku) {
      const sku = dto.sku.trim().toUpperCase();
      if (!isValidSkuFormat(sku)) {
        throw new BadRequestException('Formato de SKU inválido. Use CAT-0001-MARC');
      }
      await this.assertSkuAvailable(sku, id);
      dto.sku = sku;
    }

    const payload: Record<string, unknown> = { ...dto };
    if (dto.name && !dto.slug) {
      payload.slug = await this.generateUniqueSlug(dto.name, id);
    } else if (dto.slug) {
      payload.slug = dto.slug.trim();
    }

    const { data, error } = await this.supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select('*, category:categories(*), brand:brands(*), images:product_images(*)')
      .single();

    if (error) throw new NotFoundException('Producto no encontrado');
    return this.normalizeProduct(data);
  }

  async remove(id: string) {
    const { error } = await this.supabase.from('products').delete().eq('id', id);
    if (error) throw error;
    return { deleted: true };
  }

  async findByCode(rawCode: string) {
    const code = rawCode.trim();
    if (!code) throw new NotFoundException('Producto no encontrado');

    const select =
      'id, sku, name, barcode, sale_price, stock_quantity, min_stock, is_active, images:product_images(id, url, storage_path, is_primary)';

    const { data: byBarcode } = await this.supabase
      .from('products')
      .select(select)
      .eq('barcode', code)
      .maybeSingle();

    if (byBarcode) return this.normalizeProduct(byBarcode);

    const { data: bySku } = await this.supabase
      .from('products')
      .select(select)
      .ilike('sku', code)
      .maybeSingle();

    if (bySku) return this.normalizeProduct(bySku);

    throw new NotFoundException('No hay producto con ese código o SKU');
  }

  async getLowStock() {
    const { data, error } = await this.supabase
      .from('products')
      .select('id, sku, name, stock_quantity, min_stock')
      .eq('is_active', true);

    if (error) throw error;
    return (data ?? []).filter((p) => Number(p.stock_quantity) <= Number(p.min_stock));
  }

  async addImage(
    productId: string,
    body: { url: string; storage_path?: string; is_primary?: boolean; sort_order?: number },
  ) {
    await this.findOne(productId);

    const resolvedUrl = buildProductImagePublicUrl(
      this.supabaseUrl,
      body.storage_path,
      body.url,
    );

    if (body.is_primary) {
      await this.supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
    }

    const { data, error } = await this.supabase
      .from('product_images')
      .insert({
        product_id: productId,
        url: resolvedUrl,
        storage_path: body.storage_path,
        is_primary: body.is_primary ?? false,
        sort_order: body.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      url: buildProductImagePublicUrl(this.supabaseUrl, data.storage_path, data.url),
    };
  }

  async updateImage(
    productId: string,
    imageId: string,
    body: { is_primary?: boolean; sort_order?: number },
  ) {
    if (body.is_primary) {
      await this.supabase
        .from('product_images')
        .update({ is_primary: false })
        .eq('product_id', productId);
    }

    const { data, error } = await this.supabase
      .from('product_images')
      .update(body)
      .eq('id', imageId)
      .eq('product_id', productId)
      .select()
      .single();

    if (error) throw new NotFoundException('Imagen no encontrada');
    return {
      ...data,
      url: buildProductImagePublicUrl(this.supabaseUrl, data.storage_path, data.url),
    };
  }

  async removeImage(productId: string, imageId: string) {
    const { data: image, error: fetchError } = await this.supabase
      .from('product_images')
      .select('storage_path')
      .eq('id', imageId)
      .eq('product_id', productId)
      .single();

    if (fetchError) throw new NotFoundException('Imagen no encontrada');

    if (image.storage_path) {
      await this.supabase.storage.from('product-images').remove([image.storage_path]);
    }

    const { error } = await this.supabase
      .from('product_images')
      .delete()
      .eq('id', imageId)
      .eq('product_id', productId);

    if (error) throw error;
    return { deleted: true };
  }
}
