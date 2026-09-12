import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { NubefactClient } from './nubefact.client';
import { IdentityService } from './identity.service';
import {
  buildNubefactPayload,
  type BillingCustomer,
  type BillingLine,
  type VoucherKind,
} from './nubefact.mapper';
import type { EmitInvoiceDto } from './dto/emit-invoice.dto';

type InvoiceRow = Record<string, unknown>;

@Injectable()
export class BillingService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly nubefact: NubefactClient,
    private readonly identity: IdentityService,
    private readonly config: ConfigService,
  ) {}

  async list() {
    const { data, error } = await this.supabase
      .from('invoices')
      .select(
        '*, order:orders(id, order_number), sale:sales(id, sale_number), customer:customers(id, full_name, document_number)',
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (!error) return data ?? [];
    if (!this.isMissingTable(error.message)) {
      throw new BadRequestException(this.tableError(error.message));
    }
    return this.listFromSettings();
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .from('invoices')
      .select(
        '*, order:orders(id, order_number), sale:sales(id, sale_number), customer:customers(*)',
      )
      .eq('id', id)
      .single();
    if (error || !data) throw new NotFoundException('Comprobante no encontrado');
    return data;
  }

  async findByOrder(orderId: string) {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (!error) return data ?? [];
    if (!this.isMissingTable(error.message)) {
      throw new BadRequestException(this.tableError(error.message));
    }
    const stored = await this.readSetting(`nubefact:ORD-${orderId}`);
    return stored ? [stored] : [];
  }

  async rememberPending(input: {
    uniqueCode: string;
    kind: VoucherKind;
    saleId?: string | null;
    orderId?: string | null;
    customerId?: string | null;
    documentType?: string;
    documentNumber?: string;
    legalName?: string;
    total?: number;
  }) {
    try {
      await this.saveInvoice({
        unique_code: input.uniqueCode,
        document_kind: input.kind,
        order_id: input.orderId ?? null,
        sale_id: input.saleId ?? null,
        customer_id: input.customerId ?? null,
        client_document_type: input.documentType ?? (input.kind === 'factura' ? 'RUC' : 'DNI'),
        client_document_number: (input.documentNumber ?? '').replace(/\D/g, '') || null,
        client_name: input.legalName?.trim() || 'CLIENTES VARIOS',
        total: input.total ?? 0,
        total_taxable: 0,
        total_igv: 0,
        status: 'pending',
      });
    } catch {
      return;
    }
  }

  async emit(dto: EmitInvoiceDto, issuedBy?: string) {
    if (!dto.order_id && !dto.sale_id) {
      throw new BadRequestException('Indica un pedido o una venta');
    }
    if (dto.order_id) return this.emitForOrder(dto.order_id, dto, issuedBy);
    return this.emitForSale(dto.sale_id!, dto, issuedBy);
  }

  async emitForOrder(orderId: string, dto: EmitInvoiceDto, issuedBy?: string) {
    const existing = await this.findIssued('order_id', orderId);
    if (existing) return existing;

    const resolved = await this.resolveEmitDto('order_id', orderId, dto);

    const { data: order, error } = await this.supabase
      .from('orders')
      .select('*, customer:customers(*), items:order_items(*, product:products(id, name, sku))')
      .eq('id', orderId)
      .single();
    if (error || !order) throw new NotFoundException('Pedido no encontrado');

    const customer = await this.enrichCustomer(
      resolved.kind,
      this.mergeCustomer(order.customer, resolved),
    );
    const lines: BillingLine[] = (order.items ?? []).map(
      (item: {
        quantity: number;
        unit_price: number;
        size?: string | null;
        color?: string | null;
        product?: { name?: string; sku?: string };
      }) => ({
        sku: item.product?.sku,
        description: [
          item.product?.name || 'Producto',
          item.size ? `Talla ${item.size}` : null,
          item.color,
        ]
          .filter(Boolean)
          .join(' '),
        quantity: Number(item.quantity),
        unitPriceWithIgv: Number(item.unit_price),
      }),
    );
    if (Number(order.shipping_cost) > 0) {
      lines.push({
        sku: 'ENVIO',
        description: 'Envío a domicilio',
        quantity: 1,
        unitPriceWithIgv: Number(order.shipping_cost),
      });
    }

    return this.generate({
      kind: resolved.kind,
      uniqueCode: `ORD-${order.id}`,
      customer,
      lines,
      paymentMethod: order.payment_method,
      notes: order.notes,
      orderId: order.id,
      saleId: null,
      customerId: order.customer_id,
      issuedBy,
    });
  }

  async emitForSale(saleId: string, dto: EmitInvoiceDto, issuedBy?: string) {
    const existing = await this.findIssued('sale_id', saleId);
    if (existing) return existing;

    const resolved = await this.resolveEmitDto('sale_id', saleId, dto);

    const { data: sale, error } = await this.supabase
      .from('sales')
      .select('*, customer:customers(*), items:sale_items(*, product:products(id, name, sku))')
      .eq('id', saleId)
      .single();
    if (error || !sale) throw new NotFoundException('Venta no encontrada');

    const customer = await this.enrichCustomer(
      resolved.kind,
      this.mergeCustomer(sale.customer, resolved),
    );
    const lines: BillingLine[] = (sale.items ?? []).map(
      (item: {
        quantity: number;
        unit_price: number;
        size?: string | null;
        color?: string | null;
        product?: { name?: string; sku?: string };
      }) => ({
        sku: item.product?.sku,
        description: [
          item.product?.name || 'Producto',
          item.size ? `Talla ${item.size}` : null,
          item.color,
        ]
          .filter(Boolean)
          .join(' '),
        quantity: Number(item.quantity),
        unitPriceWithIgv: Number(item.unit_price),
      }),
    );

    return this.generate({
      kind: resolved.kind,
      uniqueCode: `SALE-${sale.id}`,
      customer,
      lines,
      paymentMethod: sale.payment_method,
      notes: sale.notes,
      orderId: null,
      saleId: sale.id,
      customerId: sale.customer_id,
      issuedBy,
    });
  }

  private async resolveEmitDto(
    column: 'order_id' | 'sale_id',
    id: string,
    dto: EmitInvoiceDto,
  ): Promise<EmitInvoiceDto & { kind: VoucherKind }> {
    const pending = await this.findLatest(column, id);
    const kind = (dto.kind ?? pending?.document_kind ?? 'boleta') as VoucherKind;
    if (kind !== 'boleta' && kind !== 'factura') {
      throw new BadRequestException('Indica si es boleta o factura');
    }

    const pendingName = String(pending?.client_name ?? '').trim();

    return {
      ...dto,
      kind,
      document_type:
        dto.document_type ||
        (pending?.client_document_type as string | undefined) ||
        (kind === 'factura' ? 'RUC' : 'DNI'),
      document_number:
        dto.document_number || (pending?.client_document_number as string | undefined),
      legal_name:
        dto.legal_name ||
        (pendingName && pendingName !== 'CLIENTES VARIOS' ? pendingName : undefined),
    };
  }

  private async findLatest(column: 'order_id' | 'sale_id', id: string) {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq(column, id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (!error && data?.[0]) return data[0] as InvoiceRow;
    const prefix = column === 'order_id' ? 'ORD' : 'SALE';
    return this.readSetting(`nubefact:${prefix}-${id}`);
  }

  private async findIssued(column: 'order_id' | 'sale_id', id: string) {
    const { data, error } = await this.supabase
      .from('invoices')
      .select('*')
      .eq(column, id)
      .eq('status', 'issued')
      .maybeSingle();
    if (!error && data) return data;
    const prefix = column === 'order_id' ? 'ORD' : 'SALE';
    const stored = await this.readSetting(`nubefact:${prefix}-${id}`);
    if (stored?.status === 'issued') return stored;
    return null;
  }

  private mergeCustomer(
    customer: {
      full_name?: string;
      email?: string | null;
      address?: string | null;
      document_type?: string | null;
      document_number?: string | null;
    } | null,
    dto: EmitInvoiceDto,
  ): BillingCustomer {
    return {
      documentType: dto.document_type || customer?.document_type,
      documentNumber: dto.document_number || customer?.document_number,
      name: dto.legal_name?.trim() || customer?.full_name || 'CLIENTES VARIOS',
      email: dto.email || customer?.email,
      address: dto.address || customer?.address,
    };
  }

  private async enrichCustomer(kind: VoucherKind, customer: BillingCustomer): Promise<BillingCustomer> {
    const number = (customer.documentNumber ?? '').replace(/\D/g, '');
    const missingName = !customer.name?.trim() || customer.name.trim() === 'CLIENTES VARIOS';
    const missingAddress = !customer.address?.trim();

    try {
      if (kind === 'factura' && number.length === 11) {
        const ruc = await this.identity.lookupRuc(number);
        return {
          ...customer,
          documentType: 'RUC',
          documentNumber: ruc.document_number,
          name: missingName ? ruc.name : customer.name,
          address: missingAddress ? ruc.address || customer.address : customer.address,
        };
      }
      if (kind === 'boleta' && number.length === 8) {
        const dni = await this.identity.lookupDni(number);
        return {
          ...customer,
          documentType: 'DNI',
          documentNumber: dni.document_number,
          name: missingName ? dni.name : customer.name,
        };
      }
    } catch (err) {
      if (kind === 'factura' && missingName) {
        throw err;
      }
    }

    return customer;
  }

  private serieFor(kind: VoucherKind) {
    if (kind === 'factura') {
      return this.config.get<string>('NUBEFACT_SERIE_FACTURA')?.trim() || 'F001';
    }
    return this.config.get<string>('NUBEFACT_SERIE_BOLETA')?.trim() || 'B001';
  }

  private seriesCandidates(kind: VoucherKind) {
    const preferred = this.serieFor(kind);
    const extras = kind === 'factura' ? ['F001', 'F002', 'FFF1'] : ['B001', 'B002', 'BBB1'];
    return [...new Set([preferred, ...extras])];
  }

  private isSerieError(message: string) {
    return /serie/i.test(message);
  }

  private async generate(input: {
    kind: VoucherKind;
    uniqueCode: string;
    customer: BillingCustomer;
    lines: BillingLine[];
    paymentMethod?: string | null;
    notes?: string | null;
    orderId: string | null;
    saleId: string | null;
    customerId?: string | null;
    issuedBy?: string;
  }) {
    let payload: ReturnType<typeof buildNubefactPayload>['payload'] | null = null;
    let totals: ReturnType<typeof buildNubefactPayload>['totals'] | null = null;
    let response: Awaited<ReturnType<NubefactClient['send']>> | null = null;
    let lastError = '';

    for (const serie of this.seriesCandidates(input.kind)) {
      try {
        const built = buildNubefactPayload({
          kind: input.kind,
          serie,
          uniqueCode: input.uniqueCode,
          customer: input.customer,
          lines: input.lines,
          paymentMethod: input.paymentMethod,
          notes: input.notes,
        });
        payload = built.payload;
        totals = built.totals;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Datos inválidos para el comprobante';
        throw new BadRequestException(message);
      }

      response = await this.nubefact.send(payload);
      lastError = typeof response.errors === 'string' ? response.errors.trim() : '';
      if (!lastError) break;
      if (!this.isSerieError(lastError)) break;
    }

    if (!payload || !totals || !response) {
      throw new BadRequestException('No se pudo armar el comprobante para Nubefact');
    }

    const errors = lastError;
    const accepted = Boolean(response.aceptada_por_sunat);
    const pdf =
      response.enlace_del_pdf || response.enlace || response.url || null;
    const status = errors ? 'error' : accepted || pdf ? 'issued' : 'rejected';

    const row: InvoiceRow = {
      unique_code: input.uniqueCode,
      document_kind: input.kind,
      serie: response.serie ? String(response.serie) : String(payload.serie),
      number: response.numero ? Number(response.numero) : null,
      order_id: input.orderId,
      sale_id: input.saleId,
      customer_id: input.customerId ?? null,
      client_document_type: String(payload.cliente_tipo_de_documento),
      client_document_number: String(payload.cliente_numero_de_documento),
      client_name: String(payload.cliente_denominacion),
      client_email: String(payload.cliente_email || ''),
      client_address: String(payload.cliente_direccion || ''),
      total_taxable: totals.totalTaxable,
      total_igv: totals.totalIgv,
      total: totals.total,
      sunat_accepted: accepted,
      sunat_description: response.sunat_description || errors || null,
      pdf_url: pdf,
      xml_url: response.enlace_del_xml || null,
      cdr_url: response.enlace_del_cdr || null,
      qr: response.cadena_para_codigo_qr || null,
      hash: response.codigo_hash || null,
      status,
      error_message: errors || response.sunat_soap_error || null,
      request_payload: payload,
      response_payload: response,
      issued_by: input.issuedBy ?? null,
      created_at: new Date().toISOString(),
    };

    const saved = await this.saveInvoice(row);

    if (status === 'error') {
      throw new BadRequestException(
        errors || 'Nubefact rechazó el comprobante. Revisa serie, RUC/DNI y datos del cliente.',
      );
    }

    return saved;
  }

  private isMissingTable(message: string) {
    return /invoices|schema cache|PGRST205/i.test(message);
  }

  private async saveInvoice(row: InvoiceRow) {
    const { data, error } = await this.supabase
      .from('invoices')
      .upsert(
        {
          unique_code: row.unique_code,
          document_kind: row.document_kind,
          serie: row.serie,
          number: row.number,
          order_id: row.order_id,
          sale_id: row.sale_id,
          customer_id: row.customer_id,
          client_document_type: row.client_document_type,
          client_document_number: row.client_document_number,
          client_name: row.client_name,
          client_email: row.client_email,
          client_address: row.client_address,
          total_taxable: row.total_taxable,
          total_igv: row.total_igv,
          total: row.total,
          sunat_accepted: row.sunat_accepted,
          sunat_description: row.sunat_description,
          pdf_url: row.pdf_url,
          xml_url: row.xml_url,
          cdr_url: row.cdr_url,
          qr: row.qr,
          hash: row.hash,
          status: row.status,
          error_message: row.error_message,
          request_payload: row.request_payload,
          response_payload: row.response_payload,
          issued_by: row.issued_by,
        },
        { onConflict: 'unique_code' },
      )
      .select()
      .single();

    if (!error && data) return data as InvoiceRow;
    if (error && !this.isMissingTable(error.message)) {
      throw new BadRequestException(error.message);
    }

    await this.supabase.from('app_settings').upsert({
      key: `nubefact:${row.unique_code}`,
      value: row,
      description: 'Comprobante electrónico Nubefact',
    });
    return { id: row.unique_code, ...row };
  }

  private async readSetting(key: string): Promise<InvoiceRow | null> {
    const { data } = await this.supabase
      .from('app_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    return (data?.value as InvoiceRow | undefined) ?? null;
  }

  private async listFromSettings() {
    const { data } = await this.supabase
      .from('app_settings')
      .select('key, value')
      .like('key', 'nubefact:%')
      .order('key', { ascending: false })
      .limit(100);
    return (data ?? []).map((row) => ({
      id: row.key,
      ...(row.value as InvoiceRow),
    }));
  }

  private tableError(message: string) {
    if (message.toLowerCase().includes('invoices')) {
      return 'Falta aplicar la migración de comprobantes. Ejecuta el SQL supabase/migrations/20260813210000_nubefact_invoices.sql en el editor de Supabase.';
    }
    return message;
  }
}
