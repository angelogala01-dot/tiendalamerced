import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { sanitizeSearchTerm } from '../../shared/utils/string.util';
import {
  DEFAULT_STORE_SETTINGS,
  type StoreSettings,
} from '../../shared/utils/order-totals.util';
import { OpenAiClient, type ChatMessage } from './openai.client';
import {
  detectIntent,
  extractOrderNumber,
  extractOrderNumberFromHistory,
  extractSearchTokens,
  isCannedIntent,
  isCatalogBrowse,
  normalizeChatText,
  shouldLookupOrder,
  SEARCH_STOPWORDS,
  type ChatIntent,
} from './chatbot.intents';
import {
  formatCatalogOverview,
  formatOrderReply,
  formatOrdersListReply,
  formatProductsReply,
  formatPromotionsReply,
  helpReply,
  howToShopReply,
  returnsReply,
  shippingReply,
  staffHelpReply,
  type ChatOrder,
  type ChatProduct,
  type ChatPromotion,
} from './chatbot.replies';
import { STAFF_ROLES, UserRole } from '../../shared/constants/roles';

type FaqRow = { question: string; answer: string; keywords?: string[] | null };

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly openai: OpenAiClient,
  ) {}

  async chat(rawMessage: string, sessionId: string, userId?: string) {
    const message = this.sanitizeMessage(rawMessage);
    if (!message) {
      throw new BadRequestException('Escribe un mensaje para continuar');
    }

    const { data: conversation, error: convError } = await this.supabase
      .from('chat_conversations')
      .upsert({ session_id: sessionId, channel: 'web' }, { onConflict: 'session_id' })
      .select('id')
      .single();

    if (convError || !conversation) {
      this.logger.warn(`No se pudo guardar la conversación: ${convError?.message}`);
    }

    const history = conversation ? await this.loadHistory(conversation.id) : [];

    if (conversation) {
      await this.supabase.from('chat_messages').insert({
        conversation_id: conversation.id,
        role: 'user',
        content: message,
      });
    }

    const { reply, source } = await this.generateReply(message, history, userId);

    if (conversation) {
      await this.supabase.from('chat_messages').insert({
        conversation_id: conversation.id,
        role: 'assistant',
        content: reply,
      });
    }

    return { reply, sessionId, source };
  }

  getFaq() {
    return this.supabase.from('faq_entries').select('*').eq('is_active', true).order('sort_order');
  }

  findAllFaqAdmin() {
    return this.supabase.from('faq_entries').select('*').order('sort_order');
  }

  createFaq(body: { question: string; answer: string; category?: string; keywords?: string[] }) {
    return this.supabase.from('faq_entries').insert(body).select().single();
  }

  updateFaq(id: string, body: Record<string, unknown>) {
    return this.supabase.from('faq_entries').update(body).eq('id', id).select().single();
  }

  deleteFaq(id: string) {
    return this.supabase.from('faq_entries').delete().eq('id', id);
  }

  private sanitizeMessage(raw: string) {
    return raw.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);
  }

  private async loadHistory(conversationId: string): Promise<ChatMessage[]> {
    const { data } = await this.supabase
      .from('chat_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(12);

    return (data ?? [])
      .reverse()
      .filter((row) => row.role === 'user' || row.role === 'assistant')
      .map((row) => ({
        role: row.role as 'user' | 'assistant',
        content: String(row.content ?? '').slice(0, 800),
      }));
  }

  private storefrontUrl() {
    return (process.env.FRONTEND_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '');
  }

  private trackUrl() {
    return `${this.storefrontUrl()}/pedidos/seguimiento`;
  }

  private async generateReply(message: string, history: ChatMessage[], userId?: string) {
    const intent = detectIntent(message);
    if (shouldLookupOrder(intent, message)) {
      const orderNumber =
        extractOrderNumber(message) ?? extractOrderNumberFromHistory(history);
      return {
        reply: await this.orderReply(orderNumber, userId),
        source: 'catalog' as const,
      };
    }

    if (intent === 'shipping') {
      return { reply: shippingReply(await this.loadStoreSettings()), source: 'rules' as const };
    }
    if (intent === 'returns') {
      return { reply: returnsReply(), source: 'rules' as const };
    }
    if (intent === 'promotions') {
      return { reply: await this.promotionsReply(), source: 'catalog' as const };
    }
    if (intent === 'hours') {
      return {
        reply: 'Atendemos de lunes a sábado, de 9:00 a.m. a 8:00 p.m. Los domingos permanecemos cerrados.',
        source: 'rules' as const,
      };
    }
    if (intent === 'payment') {
      return {
        reply:
          'Aceptamos efectivo, tarjetas, Yape, Plin y transferencias. Pagas en el checkout de la web o al recoger en tienda.',
        source: 'rules' as const,
      };
    }
    if (intent === 'invoice') {
      return {
        reply:
          'Al comprar eliges boleta (DNI) o factura (RUC). El PDF de Nubefact queda en tu pedido. Si no salió, ábrelo en /pedidos y pulsa generar comprobante.',
        source: 'rules' as const,
      };
    }
    if (intent === 'contact') {
      return {
        reply:
          'Escríbenos a info@lamerced.com o en /contacto. Tienda: lunes a sábado, 9:00 a.m. a 8:00 p.m.',
        source: 'rules' as const,
      };
    }

    if (intent === 'help') {
      return { reply: helpReply(await this.isStaff(userId)), source: 'rules' as const };
    }
    if (intent === 'howto') {
      return { reply: howToShopReply(), source: 'rules' as const };
    }
    if (intent === 'staff') {
      return {
        reply: (await this.isStaff(userId))
          ? staffHelpReply(this.adminUrl())
          : `${howToShopReply()}\n\nSi eres del equipo, inicia sesión en el panel para que te oriente con inventario, POS y pedidos.`,
        source: 'rules' as const,
      };
    }

    if (intent === 'products') {
      if (isCatalogBrowse(message)) {
        return { reply: await this.catalogOverview(), source: 'catalog' as const };
      }
      const products = await this.findProducts(message);
      const term = this.primarySearchTerm(message);
      if (products.length) {
        return { reply: formatProductsReply(products, term), source: 'catalog' as const };
      }
      const featured = await this.featuredProducts();
      if (featured.length) {
        return {
          reply: `No vi una coincidencia exacta${term ? ` para "${term}"` : ''}. Esto hay ahora en tienda:\n\n${formatProductsReply(featured)}`,
          source: 'catalog' as const,
        };
      }
      if (!this.openai.isConfigured()) {
        return { reply: formatProductsReply([], term), source: 'catalog' as const };
      }
    }

    if (intent === 'unknown' && extractSearchTokens(message).length) {
      const products = await this.findProducts(message);
      if (products.length) {
        return {
          reply: formatProductsReply(products, this.primarySearchTerm(message)),
          source: 'catalog' as const,
        };
      }
    }

    if (isCannedIntent(intent)) {
      return { reply: this.cannedReply(intent), source: 'rules' as const };
    }

    if (this.openai.isConfigured()) {
      try {
        const context = await this.buildStoreContext(message, intent);
        const reply = await this.openai.chat([
          { role: 'system', content: this.systemPrompt() },
          { role: 'system', content: context },
          ...history,
          { role: 'user', content: message },
        ]);
        return { reply, source: 'openai' as const };
      } catch (err) {
        this.logger.warn(
          `OpenAI no disponible, se usa respuesta de respaldo: ${err instanceof Error ? err.message : 'error'}`,
        );
      }
    }

    return { reply: await this.fallbackReply(message, intent), source: 'fallback' as const };
  }

  private cannedReply(intent: ChatIntent) {
    if (intent === 'thanks') {
      return '¡Con gusto! Puedo buscar un producto, seguir un pedido o resolver envíos, pagos y horarios.';
    }
    return helpReply(false).replace('Puedo ayudarte con esto:', '¡Hola! Soy el asistente de La Merced PyK.');
  }

  private adminUrl() {
    return (process.env.ADMIN_URL?.trim() || 'http://localhost:3001').replace(/\/$/, '');
  }

  private async isStaff(userId?: string) {
    if (!userId) return false;
    const { data } = await this.supabase.from('profiles').select('role').eq('id', userId).maybeSingle();
    return Boolean(data?.role && STAFF_ROLES.includes(data.role as UserRole));
  }

  private systemPrompt() {
    return [
      'Eres el asistente de La Merced PyK. Ayudas a clientes y al personal de tienda.',
      'Responde en español, claro y accionable. Si hay datos de catálogo o pedidos en el contexto, úsalos; no inventes precios, stock ni estados.',
      'Explica cómo comprar (catálogo → carrito → checkout), seguir pedidos (P-AAAAMMDD-NNNNN), pagos, envíos y comprobantes.',
      'Si el usuario es personal, orienta al panel: productos, inventario, POS, pedidos, Nubefact, clientes.',
      'Horario: lunes a sábado 9:00 a.m. a 8:00 p.m. Contacto: info@lamerced.com y /contacto.',
    ].join(' ');
  }

  private async orderReply(orderNumber: string | null, userId?: string) {
    if (orderNumber) {
      const order = await this.findOrderByNumber(orderNumber);
      if (!order) {
        return `No encuentro el pedido ${orderNumber}. Revisa que esté así: P-20260820-00001. También está en el correo de confirmación o en /pedidos/seguimiento.`;
      }
      return formatOrderReply(order, this.trackUrl());
    }

    if (userId) {
      const orders = await this.findRecentOrdersForUser(userId);
      return formatOrdersListReply(orders, this.trackUrl());
    }

    return 'Para seguir tu compra pégame el número de pedido (ejemplo: P-20260820-00001). Lo encuentras en el correo de confirmación o en /pedidos si iniciaste sesión.';
  }

  private async findOrderByNumber(orderNumber: string): Promise<ChatOrder | null> {
    const { data, error } = await this.supabase
      .from('orders')
      .select(
        'order_number, status, total, shipping_city, created_at, items:order_items(quantity, product:products(name, slug))',
      )
      .ilike('order_number', orderNumber)
      .maybeSingle();

    if (error || !data) return null;
    return data as ChatOrder;
  }

  private async findRecentOrdersForUser(userId: string): Promise<ChatOrder[]> {
    const { data: customer } = await this.supabase
      .from('customers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!customer) return [];

    const { data } = await this.supabase
      .from('orders')
      .select('order_number, status, total, shipping_city, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(3);

    return (data ?? []) as ChatOrder[];
  }

  private async promotionsReply() {
    const now = new Date().toISOString();
    const { data } = await this.supabase
      .from('promotions')
      .select('name, description, discount_type, discount_value, min_purchase, end_date')
      .eq('is_active', true)
      .lte('start_date', now)
      .gte('end_date', now)
      .order('start_date', { ascending: false })
      .limit(5);

    return formatPromotionsReply((data ?? []) as ChatPromotion[]);
  }

  private async loadStoreSettings(): Promise<StoreSettings> {
    const { data } = await this.supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'store')
      .maybeSingle();

    const value = (data?.value ?? {}) as Record<string, unknown>;
    return {
      currency: String(value.currency ?? DEFAULT_STORE_SETTINGS.currency),
      tax_rate: Number(value.tax_rate ?? DEFAULT_STORE_SETTINGS.tax_rate),
      shipping_flat: Number(value.shipping_flat ?? DEFAULT_STORE_SETTINGS.shipping_flat),
      free_shipping_min: Number(value.free_shipping_min ?? DEFAULT_STORE_SETTINGS.free_shipping_min),
      company_name: DEFAULT_STORE_SETTINGS.company_name,
      company_phone: DEFAULT_STORE_SETTINGS.company_phone,
      pickup_address: DEFAULT_STORE_SETTINGS.pickup_address,
    };
  }

  private async buildStoreContext(message: string, intent: ChatIntent) {
    const [faq, products, settings, promos] = await Promise.all([
      this.loadFaqContext(),
      this.loadProductContext(message),
      this.loadStoreSettings(),
      this.promotionsReply(),
    ]);

    return [
      `Contexto actual de la tienda:`,
      `Intención detectada: ${intent}`,
      `Envío: ${settings.shipping_flat} soles; gratis desde ${settings.free_shipping_min}.`,
      faq,
      products,
      `Promociones:\n${promos}`,
    ].join('\n\n');
  }

  private async loadFaqContext() {
    const { data } = await this.supabase
      .from('faq_entries')
      .select('question, answer, keywords')
      .eq('is_active', true)
      .order('sort_order')
      .limit(12);

    if (!data?.length) return 'FAQ: no hay entradas activas.';

    return (
      'Preguntas frecuentes:\n' +
      data
        .map((row) => `- ${row.question}: ${String(row.answer).slice(0, 280)}`)
        .join('\n')
    );
  }

  private async loadProductContext(message: string) {
    const products = await this.findProducts(message);
    const term = this.primarySearchTerm(message);
    if (!products.length) {
      return term
        ? `Catálogo: no hay coincidencias para "${term}". Invita a visitar /catalogo.`
        : 'Catálogo: muestra productos destacados si los hay.';
    }
    return formatProductsReply(products, term);
  }

  private async featuredProducts() {
    const { data, error } = await this.supabase
      .from('products')
      .select(
        'name, sku, slug, sale_price, stock_quantity, brand_id, category_id, brand:brands(name), category:categories(name)',
      )
      .eq('is_active', true)
      .order('stock_quantity', { ascending: false })
      .limit(6);
    if (error) {
      this.logger.warn(`Catálogo destacado: ${error.message}`);
      return [];
    }
    return (data ?? []) as unknown as ChatProduct[];
  }

  private async catalogOverview() {
    const [{ data: categories }, products] = await Promise.all([
      this.supabase.from('categories').select('name').order('name').limit(10),
      this.featuredProducts(),
    ]);
    return formatCatalogOverview(categories ?? [], products);
  }

  private async findProducts(message: string): Promise<ChatProduct[]> {
    const tokens = extractSearchTokens(message).slice(0, 6);
    if (!tokens.length) return this.featuredProducts();

    const safeTokens = tokens.map((token) => sanitizeSearchTerm(token, 30)).filter((token) => token.length >= 3);
    const lookupOr = safeTokens
      .flatMap((token) => [`name.ilike.%${token}%`, `slug.ilike.%${token}%`])
      .join(',');
    const productOr = safeTokens
      .flatMap((token) => [
        `name.ilike.%${token}%`,
        `sku.ilike.%${token}%`,
        `description.ilike.%${token}%`,
      ])
      .join(',');

    const [{ data: brands, error: brandError }, { data: categories, error: catError }, { data: byText, error: productError }] =
      await Promise.all([
        this.supabase.from('brands').select('id, name').or(lookupOr).limit(5),
        this.supabase.from('categories').select('id, name').or(lookupOr).limit(5),
        this.supabase
          .from('products')
          .select(
            'name, sku, slug, sale_price, stock_quantity, brand_id, category_id, brand:brands(name), category:categories(name)',
          )
          .eq('is_active', true)
          .or(productOr)
          .limit(10),
      ]);

    if (brandError) this.logger.warn(`Búsqueda marcas: ${brandError.message}`);
    if (catError) this.logger.warn(`Búsqueda categorías: ${catError.message}`);
    if (productError) this.logger.warn(`Búsqueda productos: ${productError.message}`);

    const matched = new Map<string, ChatProduct>();
    for (const product of (byText ?? []) as unknown as ChatProduct[]) {
      matched.set(product.sku, product);
    }

    const brandIds = (brands ?? []).map((row) => row.id);
    const categoryIds = (categories ?? []).map((row) => row.id);
    if (brandIds.length || categoryIds.length) {
      let related = this.supabase
        .from('products')
        .select(
          'name, sku, slug, sale_price, stock_quantity, brand_id, category_id, brand:brands(name), category:categories(name)',
        )
        .eq('is_active', true)
        .limit(10);
      if (brandIds.length) related = related.in('brand_id', brandIds);
      else related = related.in('category_id', categoryIds);
      const { data, error } = await related;
      if (error) this.logger.warn(`Búsqueda relacionada: ${error.message}`);
      for (const product of (data ?? []) as unknown as ChatProduct[]) {
        matched.set(product.sku, product);
      }
    }

    return [...matched.values()]
      .sort((a, b) => Number(b.stock_quantity) - Number(a.stock_quantity))
      .slice(0, 6);
  }

  private primarySearchTerm(message: string) {
    return (
      normalizeChatText(message)
        .split(/[^a-z0-9]+/)
        .find((token) => token.length >= 3 && !SEARCH_STOPWORDS.has(token)) ?? null
    );
  }

  private async fallbackReply(message: string, intent: ChatIntent) {
    if (intent === 'help') return helpReply(false);
    if (intent === 'howto') return howToShopReply();
    if (intent === 'products') {
      if (isCatalogBrowse(message)) return this.catalogOverview();
      const products = await this.findProducts(message);
      if (products.length) return formatProductsReply(products, this.primarySearchTerm(message));
      const featured = await this.featuredProducts();
      return featured.length
        ? formatProductsReply(featured)
        : formatProductsReply([], this.primarySearchTerm(message));
    }

    const faqMatch = await this.matchFaq(message);
    if (faqMatch) return faqMatch;

    const maybeProducts = await this.findProducts(message);
    if (this.primarySearchTerm(message) && maybeProducts.length) {
      return formatProductsReply(maybeProducts, this.primarySearchTerm(message));
    }

    return helpReply(false);
  }

  private async matchFaq(message: string) {
    const { data } = await this.supabase
      .from('faq_entries')
      .select('question, answer, keywords')
      .eq('is_active', true)
      .limit(20);

    if (!data?.length) return null;

    const tokens = normalizeChatText(message)
      .split(' ')
      .filter((token) => token.length >= 4 && !SEARCH_STOPWORDS.has(token));
    if (!tokens.length) return null;

    let best: { answer: string; score: number } | null = null;
    for (const row of data as FaqRow[]) {
      const haystack = normalizeChatText(
        `${row.question} ${row.answer} ${(row.keywords ?? []).join(' ')}`,
      );
      const score = tokens.reduce((sum, token) => sum + (haystack.includes(token) ? 1 : 0), 0);
      if (score > 0 && (!best || score > best.score)) {
        best = { answer: row.answer, score };
      }
    }

    return best && best.score >= 1 ? best.answer : null;
  }
}
