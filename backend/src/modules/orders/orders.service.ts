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
    const productIds = dto.items.map((i) => i.product_id);
    const { data: products, error: productsError } = await this.supabase
      .from('products')
      .select('id, name, sku, sale_price, stock_quantity, min_stock, is_active')
      .in('id', productIds);

    if (productsError) throw productsError;
    if (!products?.length || products.length !== dto.items.length) {
      throw new BadRequestException('Uno o más productos no existen');
    }

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.product_id)!;
      if (!product.is_active) {
        throw new BadRequestException(`Producto inactivo: ${product.name}`);
      }
      if (product.stock_quantity < item.quantity) {
        throw new BadRequestException(`Stock insuficiente: ${product.name}`);
      }
    }

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
            ...(dto.shipping_address ? { address: dto.shipping_address } : {}),
            ...(dto.shipping_city ? { city: dto.shipping_city } : {}),
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
          address: dto.shipping_address,
          city: dto.shipping_city,
        })
        .select('id')
        .single();

      if (customerError) throw customerError;
      customerId = newCustomer.id;
    }

    const orderItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.product_id)!;
      const unitPrice = Number(product.sale_price);
      return {
        product_id: item.product_id,
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
    const { shipping_cost: shippingCost, total } = calculateOrderTotals(
      subtotal,
      storeSettings,
      discount,
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
        shipping_address: dto.shipping_address,
        shipping_city: dto.shipping_city,
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

    for (const item of dto.items) {
      const product = products.find((p) => p.id === item.product_id)!;
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

    if (fetchError) throw fetchError;

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
}
