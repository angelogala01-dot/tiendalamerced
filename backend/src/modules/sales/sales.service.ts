import { BadRequestException, HttpException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateSaleDto } from './dto/create-sale.dto';
import { BillingService } from '../billing/billing.service';
import { SettingsService } from '../settings/settings.service';
import { calculatePosTotals } from '../../shared/utils/order-totals.util';

const SALE_SELECT =
  '*, customer:customers(*), items:sale_items(*, product:products(*)), invoices(*)';
const SALE_SELECT_FALLBACK =
  '*, customer:customers(*), items:sale_items(*, product:products(*))';

@Injectable()
export class SalesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly billingService: BillingService,
    private readonly settings: SettingsService,
  ) {}

  async findAll(page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const run = (select: string) =>
      this.supabase
        .from('sales')
        .select(select, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

    let { data, error, count } = await run(SALE_SELECT);
    if (error && /invoices/i.test(error.message)) {
      ({ data, error, count } = await run(SALE_SELECT_FALLBACK));
    }

    if (error) throw error;
    return { data, total: count, page, limit };
  }

  async findOne(id: string) {
    const run = (select: string) =>
      this.supabase.from('sales').select(select).eq('id', id).single();

    let { data, error } = await run(SALE_SELECT);
    if (error && /invoices/i.test(error.message)) {
      ({ data, error } = await run(SALE_SELECT_FALLBACK));
    }

    if (error || !data) throw error;
    return data as unknown as Record<string, unknown>;
  }

  async create(dto: CreateSaleDto, sellerId?: string) {
    await this.assertStock(dto.items);

    const subtotal = dto.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const settings = await this.settings.getStoreSettings();
    const { discount, tax, total } = calculatePosTotals(
      subtotal,
      settings.tax_rate,
      dto.discount ?? 0,
    );
    const customerId = dto.customer_id ?? (await this.resolvePosCustomer(dto));

    const { data: sale, error: saleError } = await this.supabase
      .from('sales')
      .insert({
        customer_id: customerId,
        seller_id: sellerId,
        subtotal,
        discount,
        tax,
        total,
        payment_method: dto.payment_method,
        notes: dto.notes,
      })
      .select()
      .single();

    if (saleError) throw saleError;

    const items = dto.items.map((item) => ({
      sale_id: sale.id,
      product_id: item.product_id,
      variant_id: item.variant_id ?? null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount ?? 0,
      subtotal: item.unit_price * item.quantity - (item.discount ?? 0),
    }));

    if (items.some((item) => item.variant_id)) {
      const variantIds = items.map((item) => item.variant_id).filter(Boolean) as string[];
      const { data: variants } = await this.supabase
        .from('product_variants')
        .select('id, size, color, product_id')
        .in('id', variantIds);
      for (const item of items) {
        const variant = variants?.find((row) => row.id === item.variant_id);
        if (variant) {
          Object.assign(item, { size: variant.size, color: variant.color });
        }
      }
    }

    const { error: itemsError } = await this.supabase.from('sale_items').insert(items);
    if (itemsError) throw itemsError;

    if (dto.voucher_type) {
      await this.billingService.rememberPending({
        uniqueCode: `SALE-${sale.id}`,
        kind: dto.voucher_type,
        saleId: sale.id,
        customerId,
        documentType: dto.document_type,
        documentNumber: dto.document_number,
        legalName: dto.legal_name,
        total,
      });
    }

    const saleDetail = await this.findOne(sale.id);
    if (!dto.voucher_type) return saleDetail;

    try {
      const invoice = await this.billingService.emitForSale(
        sale.id,
        {
          kind: dto.voucher_type,
          sale_id: sale.id,
          document_type: dto.document_type,
          document_number: dto.document_number,
          legal_name: dto.legal_name,
        },
        sellerId,
      );
      return { ...saleDetail, invoice };
    } catch (err) {
      const message =
        err instanceof HttpException
          ? err.message
          : 'La venta se registró, pero el comprobante quedó pendiente.';
      return {
        ...saleDetail,
        invoice: null,
        invoice_error: message,
      };
    }
  }

  private async assertStock(items: CreateSaleDto['items']) {
    const productIds = [...new Set(items.map((item) => item.product_id))];
    const variantIds = [...new Set(items.map((item) => item.variant_id).filter(Boolean))] as string[];

    const [{ data: products, error: productsError }, variantsResult] = await Promise.all([
      this.supabase
        .from('products')
        .select('id, name, stock_quantity, variants:product_variants(id, is_active)')
        .in('id', productIds),
      variantIds.length
        ? this.supabase
            .from('product_variants')
            .select('id, size, color, stock_quantity, product_id, is_active')
            .in('id', variantIds)
        : Promise.resolve({ data: [] as Array<{
            id: string;
            size: string | null;
            color: string | null;
            stock_quantity: number;
            product_id: string;
            is_active: boolean;
          }>, error: null }),
    ]);

    if (productsError) throw productsError;
    if (variantsResult.error) throw variantsResult.error;

    const variants = variantsResult.data ?? [];

    for (const item of items) {
      const product = products?.find((row) => row.id === item.product_id);
      if (!product) {
        throw new BadRequestException('Hay un producto que ya no está en el catálogo');
      }

      const activeVariants = (product.variants ?? []).filter((row) => row.is_active !== false);
      if (activeVariants.length && !item.variant_id) {
        throw new BadRequestException(`Elige talla o color para ${product.name}`);
      }

      if (item.variant_id) {
        const variant = variants.find((row) => row.id === item.variant_id);
        if (!variant || variant.product_id !== item.product_id) {
          throw new BadRequestException(`Talla o color inválido en ${product.name}`);
        }
        if (variant.stock_quantity < item.quantity) {
          const label = [variant.size ? `talla ${variant.size}` : null, variant.color]
            .filter(Boolean)
            .join(' ');
          throw new BadRequestException(
            `Stock insuficiente de ${product.name}${label ? ` (${label})` : ''}: ${variant.stock_quantity} disponible(s)`,
          );
        }
        continue;
      }

      if (product.stock_quantity < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente de ${product.name}: ${product.stock_quantity} disponible(s)`,
        );
      }
    }
  }

  private async resolvePosCustomer(dto: CreateSaleDto): Promise<string | undefined> {
    const documentNumber = (dto.document_number ?? '').replace(/\D/g, '');
    const legalName = dto.legal_name?.trim();
    if (!documentNumber && !legalName) return undefined;

    const documentType = dto.document_type || (dto.voucher_type === 'factura' ? 'RUC' : 'DNI');

    if (documentNumber) {
      const { data: existing } = await this.supabase
        .from('customers')
        .select('id, full_name')
        .eq('document_number', documentNumber)
        .maybeSingle();

      if (existing) {
        const nextName = legalName && legalName !== existing.full_name ? legalName : undefined;
        if (nextName || documentType) {
          await this.supabase
            .from('customers')
            .update({
              ...(nextName ? { full_name: nextName } : {}),
              document_type: documentType,
              document_number: documentNumber,
            })
            .eq('id', existing.id);
        }
        return existing.id as string;
      }
    }

    const { data: created, error } = await this.supabase
      .from('customers')
      .insert({
        full_name: legalName || (dto.voucher_type === 'factura' ? 'Empresa' : 'Cliente mostrador'),
        document_type: documentType,
        document_number: documentNumber || null,
      })
      .select('id')
      .single();

    if (error || !created) return undefined;
    return created.id as string;
  }
}
