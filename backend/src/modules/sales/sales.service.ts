import { HttpException, Inject, Injectable } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { CreateSaleDto } from './dto/create-sale.dto';
import { BillingService } from '../billing/billing.service';

const SALE_SELECT =
  '*, customer:customers(*), items:sale_items(*, product:products(*)), invoices(*)';
const SALE_SELECT_FALLBACK =
  '*, customer:customers(*), items:sale_items(*, product:products(*))';

@Injectable()
export class SalesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly billingService: BillingService,
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
    const subtotal = dto.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
    const total = subtotal - (dto.discount ?? 0) + (dto.tax ?? 0);

    const { data: sale, error: saleError } = await this.supabase
      .from('sales')
      .insert({
        customer_id: dto.customer_id,
        seller_id: sellerId,
        subtotal,
        discount: dto.discount ?? 0,
        tax: dto.tax ?? 0,
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
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount: item.discount ?? 0,
      subtotal: item.unit_price * item.quantity - (item.discount ?? 0),
    }));

    const { error: itemsError } = await this.supabase.from('sale_items').insert(items);
    if (itemsError) throw itemsError;

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
}
