import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import {
  calculateOrderTotals,
  calculatePromotionDiscount,
} from '../../shared/utils/order-totals.util';
import { SettingsService } from '../settings/settings.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { DeliverOrderDto } from './dto/deliver-order.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly settingsService: SettingsService,
    private readonly promotionsService: PromotionsService,
    private readonly billingService: BillingService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
  ) {}

  async findAll(status?: string) {
    const base = '*, customer:customers(*), items:order_items(*, product:products(*))';
    const run = (select: string) => {
      let query = this.supabase
        .from('orders')
        .select(select)
        .order('created_at', { ascending: false });
      if (status) query = query.eq('status', status);
      return query;
    };

    const result = await run(`${base}, invoices(*)`);
    if (result.error && /invoices/i.test(result.error.message)) {
      return run(base);
    }
    return result;
  }

  findMyOrders(userId: string) {
    return this.supabase
      .from('orders')
      .select('*, items:order_items(*, product:products(id, name, sku, slug)), invoices(*)')
      .eq('customer.customers.user_id', userId)
      .order('created_at', { ascending: false });
  }

  async findMyOrdersByUser(userId: string) {
    const { data: customer } = await this.supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!customer) return { data: [] };

    const mySelect = `*,
        items:order_items(
          *,
          product:products(
            id,
            name,
            sku,
            slug,
            images:product_images(url, storage_path, is_primary)
          )
        )`;
    let { data, error } = await this.supabase
      .from('orders')
      .select(`${mySelect}, invoices(*)`)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (error && /invoices/i.test(error.message)) {
      ({ data, error } = await this.supabase
        .from('orders')
        .select(mySelect)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false }));
    }

    if (error) {
      throw new BadRequestException(
        error.message ?? 'No se pudieron cargar tus pedidos',
      );
    }
    return { data: data ?? [] };
  }

  async findOne(id: string) {
    const withInv =
      '*, customer:customers(*), items:order_items(*, product:products(*)), history:order_status_history(*), invoices(*)';
    const without =
      '*, customer:customers(*), items:order_items(*, product:products(*)), history:order_status_history(*)';
    let { data, error } = await this.supabase.from('orders').select(withInv).eq('id', id).single();
    if (error && /invoices/i.test(error.message)) {
      ({ data, error } = await this.supabase.from('orders').select(without).eq('id', id).single());
    }
    if (error) throw new NotFoundException('Pedido no encontrado');
    return this.withInvoices(data);
  }

  async findByNumber(orderNumber: string) {
    const detail = `*,
        customer:customers(*),
        items:order_items(
          *,
          product:products(
            *,
            images:product_images(url, storage_path, is_primary)
          )
        ),
        history:order_status_history(*)`;
    let { data, error } = await this.supabase
      .from('orders')
      .select(`${detail}, invoices(*)`)
      .eq('order_number', orderNumber)
      .single();
    if (error && /invoices/i.test(error.message)) {
      ({ data, error } = await this.supabase
        .from('orders')
        .select(detail)
        .eq('order_number', orderNumber)
        .single());
    }

    if (error || !data) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.withInvoices(data);
  }

  async emitForCustomer(
    orderId: string,
    userId: string,
    dto: { kind?: 'boleta' | 'factura'; document_type?: string; document_number?: string; legal_name?: string },
  ) {
    const { data: customer } = await this.supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!customer) throw new BadRequestException('No tienes un perfil de cliente');

    const { data: order } = await this.supabase
      .from('orders')
      .select('id, customer_id')
      .eq('id', orderId)
      .maybeSingle();
    if (!order || order.customer_id !== customer.id) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.billingService.emitForOrder(
      orderId,
      {
        kind: dto.kind ?? 'boleta',
        order_id: orderId,
        document_type: dto.document_type,
        document_number: dto.document_number,
        legal_name: dto.legal_name,
      },
      userId,
    );
  }

  private async withInvoices<T extends { id: string; invoices?: unknown }>(order: T) {
    if (Array.isArray(order.invoices) && order.invoices.length) return order;
    const invoices = await this.billingService.findByOrder(order.id);
    return { ...order, invoices };
  }

  async create(dto: CreateOrderDto, userId: string) {
    const productIds = [...new Set(dto.items.map((i) => i.product_id))];
    const { data: products, error: productsError } = await this.supabase
      .from('products')
      .select(
        'id, name, sku, sale_price, stock_quantity, min_stock, is_active, variants:product_variants(id, size, color, stock_quantity, is_active)',
      )
      .in('id', productIds);

    if (productsError) throw productsError;
    if (!products?.length || products.length !== productIds.length) {
      throw new BadRequestException('Uno o más productos no existen');
    }

    type ProductRow = (typeof products)[number] & {
      variants?: Array<{
        id: string;
        size?: string | null;
        color?: string | null;
        stock_quantity: number;
        is_active?: boolean;
      }>;
    };

    const resolved = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id) as ProductRow | undefined;
      if (!product) throw new BadRequestException('Uno o más productos no existen');
      if (!product.is_active) {
        throw new BadRequestException(`Producto inactivo: ${product.name}`);
      }
      const variants = (product.variants ?? []).filter((variant) => variant.is_active !== false);
      if (variants.length) {
        if (!item.variant_id) {
          throw new BadRequestException(`Elige talla o color para ${product.name}`);
        }
        const variant = variants.find((row) => row.id === item.variant_id);
        if (!variant) {
          throw new BadRequestException(`La talla/color no existe en ${product.name}`);
        }
        if (variant.stock_quantity < item.quantity) {
          throw new BadRequestException(`Stock insuficiente: ${product.name}`);
        }
        return { item, product, variant };
      }
      if (item.variant_id) {
        throw new BadRequestException(`${product.name} no tiene variantes`);
      }
      if (product.stock_quantity < item.quantity) {
        throw new BadRequestException(`Stock insuficiente: ${product.name}`);
      }
      return { item, product, variant: null };
    });

    let customerId: string;
    const { data: existingCustomer } = await this.supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      if (dto.document_number || dto.legal_name || dto.document_type) {
        await this.supabase
          .from('customers')
          .update({
            ...(dto.legal_name ? { full_name: dto.legal_name } : {}),
            ...(dto.document_type ? { document_type: dto.document_type } : {}),
            ...(dto.document_number ? { document_number: dto.document_number } : {}),
            ...(dto.fulfillment_method !== 'pickup' && dto.shipping_address
              ? { address: dto.shipping_address }
              : {}),
            ...(dto.fulfillment_method !== 'pickup' && dto.shipping_city
              ? { city: dto.shipping_city }
              : {}),
          })
          .eq('id', customerId);
      }
    } else {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('email, full_name, phone')
        .eq('id', userId)
        .single();

      const { data: newCustomer, error: customerError } = await this.supabase
        .from('customers')
        .insert({
          user_id: userId,
          full_name: dto.legal_name || profile?.full_name || 'Cliente',
          email: profile?.email,
          phone: profile?.phone,
          document_type: dto.document_type || (dto.voucher_type === 'factura' ? 'RUC' : 'DNI'),
          document_number: dto.document_number,
          address: dto.fulfillment_method === 'pickup' ? undefined : dto.shipping_address,
          city: dto.fulfillment_method === 'pickup' ? undefined : dto.shipping_city,
        })
        .select('id')
        .single();

      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    const orderItems = resolved.map(({ item, product, variant }) => {
      const unitPrice = Number(product.sale_price);
      return {
        product_id: item.product_id,
        variant_id: variant?.id ?? null,
        size: variant?.size ?? null,
        color: variant?.color ?? null,
        quantity: item.quantity,
        unit_price: unitPrice,
        subtotal: unitPrice * item.quantity,
      };
    });

    const subtotal = orderItems.reduce((acc, i) => acc + i.subtotal, 0);

    let discount = 0;
    const welcome = await this.promotionsService.getWelcomeEligibility(userId);
    if (welcome.eligible && welcome.promotion) {
      discount = calculatePromotionDiscount(subtotal, welcome.promotion);
    }

    const storeSettings = await this.settingsService.getStoreSettings();
    const isPickup = dto.fulfillment_method === 'pickup';
    const { shipping_cost: shippingCost, total } = calculateOrderTotals(
      subtotal,
      storeSettings,
      discount,
      isPickup,
    );

    const { data: order, error: orderError } = await this.supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        order_number: '',
        status: 'pending',
        subtotal,
        shipping_cost: shippingCost,
        discount,
        total,
        payment_method: dto.payment_method ?? 'transfer',
        shipping_address: isPickup ? storeSettings.pickup_address : dto.shipping_address,
        shipping_city: isPickup ? 'Retiro en tienda' : dto.shipping_city,
        notes: dto.notes,
      })
      .select('id, order_number')
      .single();

    if (orderError) {
      throw new BadRequestException(
        orderError.message ?? 'No se pudo registrar el pedido',
      );
    }

    const itemsWithOrder = orderItems.map((item) => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await this.supabase.from('order_items').insert(itemsWithOrder);
    if (itemsError) throw itemsError;

    for (const { item, product, variant } of resolved) {
      if (variant) {
        const stockBefore = variant.stock_quantity;
        const stockAfter = stockBefore - item.quantity;
        await this.supabase
          .from('product_variants')
          .update({ stock_quantity: stockAfter })
          .eq('id', variant.id);
        await this.supabase.from('inventory_movements').insert({
          product_id: item.product_id,
          variant_id: variant.id,
          movement_type: 'sale',
          quantity: item.quantity,
          stock_before: stockBefore,
          stock_after: stockAfter,
          reference_type: 'order',
          reference_id: order.id,
        });
        if (stockAfter <= Number(product.min_stock ?? 0) && stockBefore > Number(product.min_stock ?? 0)) {
          await this.notifications.notifyLowStock({
            id: product.id,
            name: product.name,
            sku: product.sku,
            stock_quantity: stockAfter,
            min_stock: Number(product.min_stock ?? 0),
          });
        }
        continue;
      }

      const stockBefore = product.stock_quantity;
      const stockAfter = stockBefore - item.quantity;

      await this.supabase
        .from('products')
        .update({ stock_quantity: stockAfter })
        .eq('id', item.product_id);

      await this.supabase.from('inventory_movements').insert({
        product_id: item.product_id,
        movement_type: 'sale',
        quantity: item.quantity,
        stock_before: stockBefore,
        stock_after: stockAfter,
        reference_type: 'order',
        reference_id: order.id,
      });

      if (stockAfter <= Number(product.min_stock ?? 0) && stockBefore > Number(product.min_stock ?? 0)) {
        await this.notifications.notifyLowStock({
          id: product.id,
          name: product.name,
          sku: product.sku,
          stock_quantity: stockAfter,
          min_stock: Number(product.min_stock ?? 0),
        });
      }
    }

    await this.supabase.from('order_status_history').insert({
      order_id: order.id,
      status: 'pending',
      notes: 'Pedido creado',
      changed_by: userId,
    });

    await this.supabase.from('cart_items').delete().eq('user_id', userId);

    await this.notifications.notifyStaff(
      'order',
      'Nuevo pedido',
      `Llegó el pedido ${order.order_number || order.id.slice(0, 8)}.`,
      { order_id: order.id, order_number: order.order_number },
    );

    let { data: fullOrder, error: fetchError } = await this.supabase
      .from('orders')
      .select('*, items:order_items(*, product:products(*)), invoices(*)')
      .eq('id', order.id)
      .single();

    if (fetchError && /invoices/i.test(fetchError.message)) {
      ({ data: fullOrder, error: fetchError } = await this.supabase
        .from('orders')
        .select('*, items:order_items(*, product:products(*))')
        .eq('id', order.id)
        .single());
    }

    if (fetchError || !fullOrder) {
      throw fetchError ?? new BadRequestException('No se pudo cargar el pedido');
    }

    await this.sendOrderPlacedEmail(customerId, fullOrder);

    const voucherType = dto.voucher_type ?? 'boleta';
    try {
      const invoice = await this.billingService.emitForOrder(
        order.id,
        {
          kind: voucherType,
          order_id: order.id,
          document_type: dto.document_type,
          document_number: dto.document_number,
          legal_name: dto.legal_name,
          address: dto.shipping_address,
        },
        userId,
      );
      return { ...fullOrder, invoice };
    } catch (err) {
      const message =
        err instanceof HttpException
          ? err.message
          : 'El pedido se registró, pero el comprobante quedó pendiente.';
      this.logger.error(`No se pudo emitir Nubefact para ${order.order_number}: ${message}`);
      return { ...fullOrder, invoice: null, invoice_error: message };
    }
  }

  async updateStatus(id: string, status: string, notes?: string, changedBy?: string) {
    const { data, error } = await this.supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new NotFoundException('Pedido no encontrado');

    await this.supabase.from('order_status_history').insert({
      order_id: id,
      status,
      notes,
      changed_by: changedBy,
    });

    if (status === 'shipped') {
      await this.notifications.notifyStaff(
        'order',
        'Pedido en camino',
        `El pedido ${data.order_number} salió a entrega.`,
        { order_id: id, order_number: data.order_number },
      );
      await this.sendOrderStatusEmail(id, 'shipped');
    }

    if (status === 'delivered') {
      await this.sendOrderStatusEmail(id, 'delivered');
    }

    return data;
  }

  async findDeliveries() {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        'id, order_number, status, total, shipping_address, shipping_city, notes, created_at, customer:customers(id, full_name, phone, email), items:order_items(id, quantity, unit_price, subtotal, product:products(id, name, sku))',
      )
      .in('status', ['pending', 'confirmed', 'processing', 'shipped'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  }

  async deliver(id: string, dto: DeliverOrderDto, userId: string) {
    const { data: order, error } = await this.supabase
      .from('orders')
      .select('id, status, order_number')
      .eq('id', id)
      .single();

    if (error || !order) throw new NotFoundException('Pedido no encontrado');
    if (order.status === 'delivered') {
      throw new BadRequestException('Este pedido ya fue entregado');
    }
    if (order.status === 'cancelled') {
      throw new BadRequestException('No se puede entregar un pedido cancelado');
    }

    const noteParts = ['Entregado en ruta'];
    if (dto.notes?.trim()) noteParts.push(dto.notes.trim());
    if (dto.photo_url?.trim()) noteParts.push(`Foto: ${dto.photo_url.trim()}`);

    return this.updateStatus(id, 'delivered', noteParts.join(' — '), userId);
  }

  private storefrontUrl() {
    return (process.env.FRONTEND_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '');
  }

  private trackUrl() {
    return `${this.storefrontUrl()}/pedidos/seguimiento`;
  }

  private productName(product: unknown) {
    const row = Array.isArray(product) ? product[0] : product;
    if (row && typeof row === 'object' && 'name' in row && typeof (row as { name?: unknown }).name === 'string') {
      return (row as { name: string }).name;
    }
    return 'Producto';
  }

  private mapEmailItems(items: unknown) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const row = item as {
        quantity?: number;
        unit_price?: number;
        subtotal?: number;
        size?: string | null;
        color?: string | null;
        product?: unknown;
      };
      const base = this.productName(row.product);
      const detail = [row.size ? `Talla ${row.size}` : null, row.color?.trim() || null]
        .filter(Boolean)
        .join(' · ');
      return {
        name: detail ? `${base} (${detail})` : base,
        quantity: Number(row.quantity ?? 0),
        unitPrice: Number(row.unit_price ?? 0),
        subtotal: Number(row.subtotal ?? 0),
      };
    });
  }

  private async sendOrderPlacedEmail(
    customerId: string,
    order: {
      id: string;
      order_number?: string;
      subtotal?: number;
      discount?: number;
      shipping_cost?: number;
      total?: number;
      shipping_address?: string | null;
      shipping_city?: string | null;
      items?: unknown;
    },
  ) {
    const { data: customer } = await this.supabase
      .from('customers')
      .select('email, full_name')
      .eq('id', customerId)
      .maybeSingle();

    await this.mail.sendOrderConfirmation(customer?.email, {
      orderId: order.id,
      orderNumber: String(order.order_number ?? ''),
      customerName: customer?.full_name,
      items: this.mapEmailItems(order.items),
      subtotal: Number(order.subtotal ?? 0),
      discount: Number(order.discount ?? 0),
      shippingCost: Number(order.shipping_cost ?? 0),
      total: Number(order.total ?? 0),
      shippingAddress: order.shipping_address,
      shippingCity: order.shipping_city,
      trackUrl: this.trackUrl(),
    });
  }

  private async sendOrderStatusEmail(orderId: string, status: 'shipped' | 'delivered') {
    const { data: order } = await this.supabase
      .from('orders')
      .select(
        'id, order_number, subtotal, discount, shipping_cost, total, shipping_address, shipping_city, customer:customers(email, full_name), items:order_items(quantity, unit_price, subtotal, size, color, product:products(name))',
      )
      .eq('id', orderId)
      .maybeSingle();

    if (!order) return;

    const customerRaw = (order as { customer?: unknown }).customer;
    const customer = Array.isArray(customerRaw) ? customerRaw[0] : customerRaw;
    const contact = (customer ?? {}) as { email?: string; full_name?: string };
    const payload = {
      orderId: order.id,
      orderNumber: String(order.order_number ?? ''),
      customerName: contact.full_name,
      items: this.mapEmailItems((order as { items?: unknown }).items),
      subtotal: Number(order.subtotal ?? 0),
      discount: Number(order.discount ?? 0),
      shippingCost: Number(order.shipping_cost ?? 0),
      total: Number(order.total ?? 0),
      shippingAddress: order.shipping_address,
      shippingCity: order.shipping_city,
      trackUrl:
        status === 'delivered'
          ? `${this.storefrontUrl()}/pedidos`
          : this.trackUrl(),
    };

    if (status === 'shipped') {
      await this.mail.sendOrderShipped(contact.email, payload);
      return;
    }

    await this.mail.sendOrderDelivered(contact.email, payload);
  }
}
