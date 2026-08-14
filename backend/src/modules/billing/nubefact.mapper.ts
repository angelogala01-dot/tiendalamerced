export function round2(value: number): number {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export type VoucherKind = 'boleta' | 'factura';

export type BillingLine = {
  sku?: string;
  description: string;
  quantity: number;
  unitPriceWithIgv: number;
};

export type BillingCustomer = {
  documentType?: string | null;
  documentNumber?: string | null;
  name: string;
  email?: string | null;
  address?: string | null;
};

export type NubefactItem = {
  unidad_de_medida: string;
  codigo: string;
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
  precio_unitario: number;
  descuento: string;
  subtotal: number;
  tipo_de_igv: number;
  igv: number;
  total: number;
  anticipo_regularizacion: boolean;
  anticipo_documento_serie: string;
  anticipo_documento_numero: string;
};

export type NubefactPayload = Record<string, unknown> & {
  operacion: string;
  tipo_de_comprobante: number;
  serie: string;
  numero: string;
  sunat_transaction: number;
  items: NubefactItem[];
};

const IGV_RATE = 18;

export function igvFromGross(gross: number, taxRate = IGV_RATE) {
  const total = round2(gross);
  const taxable = round2(total / (1 + taxRate / 100));
  const igv = round2(total - taxable);
  return { total, taxable, igv };
}

export function mapDocumentType(kind: VoucherKind, raw?: string | null): string {
  const value = (raw ?? '').toUpperCase();
  if (kind === 'factura') return '6';
  if (value === 'RUC' || value === '6') return '6';
  if (value === 'CE' || value === 'CARNET' || value === '4') return '4';
  if (value === 'PASAPORTE' || value === '7') return '7';
  if (value === 'DNI' || value === '1') return '1';
  return '-';
}

export function resolveCustomerForVoucher(kind: VoucherKind, customer: BillingCustomer) {
  const number = (customer.documentNumber ?? '').replace(/\D/g, '');
  const name = customer.name.trim() || 'CLIENTES VARIOS';

  if (kind === 'factura') {
    if (number.length !== 11) {
      throw new Error('La factura requiere un RUC de 11 dígitos');
    }
    if (!name || name === 'CLIENTES VARIOS') {
      throw new Error('La factura requiere la razón social del cliente');
    }
    return {
      tipo: '6',
      numero: number,
      nombre: name,
      direccion: customer.address?.trim() || '-',
      email: customer.email?.trim() || '',
    };
  }

  if (number.length === 8) {
    return {
      tipo: '1',
      numero: number,
      nombre: name,
      direccion: customer.address?.trim() || '',
      email: customer.email?.trim() || '',
    };
  }

  return {
    tipo: '-',
    numero: '00000000',
    nombre: name || 'CLIENTES VARIOS',
    direccion: customer.address?.trim() || '',
    email: customer.email?.trim() || '',
  };
}

export function buildNubefactItems(lines: BillingLine[], taxRate = IGV_RATE): {
  items: NubefactItem[];
  totalTaxable: number;
  totalIgv: number;
  total: number;
} {
  const items = lines
    .filter((line) => line.quantity > 0 && line.unitPriceWithIgv >= 0)
    .map((line) => {
      const qty = Number(line.quantity);
      const gross = round2(line.unitPriceWithIgv);
      const { taxable, igv } = igvFromGross(gross, taxRate);
      const total = round2(gross * qty);
      const subtotal = round2(taxable * qty);
      const igvTotal = round2(total - subtotal);
      return {
        unidad_de_medida: 'NIU',
        codigo: line.sku?.slice(0, 30) || '',
        descripcion: line.description.slice(0, 250) || 'Producto',
        cantidad: qty,
        valor_unitario: taxable,
        precio_unitario: gross,
        descuento: '',
        subtotal,
        tipo_de_igv: 1,
        igv: igvTotal,
        total,
        anticipo_regularizacion: false,
        anticipo_documento_serie: '',
        anticipo_documento_numero: '',
      } satisfies NubefactItem;
    });

  const total = round2(items.reduce((sum, item) => sum + item.total, 0));
  const totalTaxable = round2(items.reduce((sum, item) => sum + item.subtotal, 0));
  const totalIgv = round2(items.reduce((sum, item) => sum + item.igv, 0));
  return { items, totalTaxable, totalIgv, total };
}

export function emissionDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Lima',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const day = parts.find((p) => p.type === 'day')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const year = parts.find((p) => p.type === 'year')?.value;
  return `${day}-${month}-${year}`;
}

export function mapPaymentMethod(method?: string | null): string {
  switch (method) {
    case 'card':
      return 'TARJETA';
    case 'yape':
      return 'YAPE';
    case 'plin':
      return 'PLIN';
    case 'transfer':
      return 'TRANSFERENCIA';
    case 'cash':
      return 'EFECTIVO';
    default:
      return 'CONTADO';
  }
}

export function buildNubefactPayload(input: {
  kind: VoucherKind;
  serie: string;
  uniqueCode: string;
  customer: BillingCustomer;
  lines: BillingLine[];
  paymentMethod?: string | null;
  notes?: string | null;
  taxRate?: number;
}): { payload: NubefactPayload; totals: { totalTaxable: number; totalIgv: number; total: number } } {
  const cliente = resolveCustomerForVoucher(input.kind, input.customer);
  const { items, totalTaxable, totalIgv, total } = buildNubefactItems(
    input.lines,
    input.taxRate ?? IGV_RATE,
  );

  if (!items.length) {
    throw new Error('El comprobante no tiene ítems');
  }

  const payload: NubefactPayload = {
    operacion: 'generar_comprobante',
    tipo_de_comprobante: input.kind === 'factura' ? 1 : 2,
    serie: input.serie,
    numero: '',
    sunat_transaction: 1,
    cliente_tipo_de_documento: cliente.tipo,
    cliente_numero_de_documento: cliente.numero,
    cliente_denominacion: cliente.nombre,
    cliente_direccion: cliente.direccion,
    cliente_email: cliente.email,
    cliente_email_1: '',
    cliente_email_2: '',
    fecha_de_emision: emissionDate(),
    fecha_de_vencimiento: '',
    moneda: 1,
    tipo_de_cambio: '',
    porcentaje_de_igv: String(input.taxRate ?? IGV_RATE),
    descuento_global: '',
    total_descuento: '',
    total_anticipo: '',
    total_gravada: totalTaxable,
    total_inafecta: '',
    total_exonerada: '',
    total_igv: totalIgv,
    total_gratuita: '',
    total_otros_cargos: '',
    total,
    percepcion_tipo: '',
    percepcion_base_imponible: '',
    percepcion: '',
    detraction: false,
    observaciones: input.notes?.slice(0, 250) || '',
    documento_que_se_modifica_tipo: '',
    documento_que_se_modifica_serie: '',
    documento_que_se_modifica_numero: '',
    tipo_de_nota_de_credito: '',
    tipo_de_nota_de_debito: '',
    enviar_automaticamente_a_la_sunat: true,
    enviar_automaticamente_al_cliente: Boolean(cliente.email),
    codigo_unico: input.uniqueCode.slice(0, 50),
    condiciones_de_pago: '',
    medio_de_pago: mapPaymentMethod(input.paymentMethod),
    placa_vehiculo: '',
    orden_compra_servicio: '',
    tabla_personalizada_codigo: '',
    formato_de_pdf: '',
    items,
  };

  return { payload, totals: { totalTaxable, totalIgv, total } };
}
