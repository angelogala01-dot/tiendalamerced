import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../../supabase/supabase.module';
import { sanitizeSearchTerm } from '../../shared/utils/string.util';
import { OpenAiClient, type ChatMessage } from './openai.client';
import {
  detectIntent,
  isCannedIntent,
  normalizeChatText,
  type ChatIntent,
} from './chatbot.intents';

const STOPWORDS = new Set([
  'para', 'una', 'unos', 'unas', 'este', 'esta', 'esto', 'como', 'cual', 'cuales',
  'cuanto', 'cuanta', 'tienen', 'tiene', 'quiero', 'busco', 'hay', 'del', 'los',
  'las', 'con', 'por', 'que', 'hola', 'buenas', 'buen', 'dia', 'dias',
  'producto', 'productos', 'tienda', 'ayuda', 'favor', 'puedo', 'puede',
]);

type FaqRow = { question: string; answer: string; keywords?: string[] | null };

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly openai: OpenAiClient,
  ) {}

  async chat(rawMessage: string, sessionId: string) {
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

    const { reply, source } = await this.generateReply(message, history);

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
      .limit(8);

    return (data ?? [])
      .reverse()
      .filter((row) => row.role === 'user' || row.role === 'assistant')
      .map((row) => ({
        role: row.role as 'user' | 'assistant',
        content: String(row.content ?? '').slice(0, 800),
      }));
  }

  private async generateReply(message: string, history: ChatMessage[]) {
    const intent = detectIntent(message);

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
      return '¡Con gusto! Si necesitas otra cosa — productos, horarios, pagos o un pedido — aquí estoy.';
    }
    return '¡Hola! Soy el asistente de La Merced PyK. ¿En qué te ayudo? Puedo contarte de productos, horarios, pagos o el seguimiento de un pedido.';
  }

  private systemPrompt() {
    return [
      'Eres el asistente virtual de Multiservicios La Merced PyK S.A.C., tienda peruana de calzado, ropa y accesorios.',
      'Responde siempre en español, cercano y claro. Máximo 120 palabras, salvo listas de productos.',
      'Si el cliente solo saluda, responde el saludo y ofrece ayuda. NUNCA respondas con el horario, métodos de pago ni un producto si no lo pidió.',
      'Usa únicamente el contexto de la tienda. Si no hay precio o stock, no lo inventes: invita a ver /catalogo.',
      'Para pedidos, pide el número (P-AAAAMMDD-NNNNN) y sugiere /pedidos/seguimiento. Nunca inventes el estado.',
      'Horario (solo si preguntan): lunes a sábado, 9:00 a.m. a 8:00 p.m. Pagos: efectivo, tarjetas, Yape, Plin y transferencias.',
      'Boletas y facturas se emiten al comprar o desde el pedido. Contacto: /contacto e info@lamerced.com.',
      'No reveles claves ni datos de otros clientes.',
    ].join(' ');
  }

  private async buildStoreContext(message: string, intent: ChatIntent) {
    const [faq, products] = await Promise.all([
      this.loadFaqContext(),
      intent === 'hours' || intent === 'payment' || intent === 'contact'
        ? Promise.resolve('Catálogo: no aplica para esta consulta.')
        : this.loadProductContext(message),
    ]);

    return `Contexto actual de la tienda:\nIntención detectada: ${intent}\n\n${faq}\n\n${products}`;
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
    const term = this.extractSearchTerm(message);

    if (!products.length) {
      return term
        ? `Catálogo: no hay coincidencias para "${term}". Invita a visitar /catalogo.`
        : 'Catálogo: no hay productos activos en este momento.';
    }

    const lines = products.map((p) => {
      const stock = Number(p.stock_quantity) > 0 ? `stock ${p.stock_quantity}` : 'sin stock';
      return `- ${p.name} (SKU ${p.sku}) — S/ ${p.sale_price} — ${stock}`;
    });

    return `Productos${term ? ` relacionados con "${term}"` : ' destacados'}:\n${lines.join('\n')}`;
  }

  private async findProducts(message: string) {
    const term = this.extractSearchTerm(message);
    let query = this.supabase
      .from('products')
      .select('name, sku, sale_price, stock_quantity')
      .eq('is_active', true)
      .limit(6);

    if (term) {
      const safe = sanitizeSearchTerm(term, 60);
      query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`);
    }

    const { data } = await query;
    return data ?? [];
  }

  private extractSearchTerm(message: string) {
    const tokens = normalizeChatText(message)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3 && !STOPWORDS.has(token));

    return tokens.slice(0, 3).join(' ');
  }

  private async fallbackReply(message: string, intent: ChatIntent) {
    if (intent === 'hours') {
      return 'Atendemos de lunes a sábado, de 9:00 a.m. a 8:00 p.m. Los domingos permanecemos cerrados.';
    }
    if (intent === 'payment') {
      return 'Aceptamos efectivo, tarjetas, Yape, Plin y transferencias bancarias. Puedes pagar al recoger o en el checkout de la web.';
    }
    if (intent === 'order') {
      return 'Para ver el estado de tu compra, entra a Seguimiento o Mis pedidos e ingresa el número (ejemplo: P-20250621-00001). Si aún no lo tienes, llega en el correo de confirmación.';
    }
    if (intent === 'invoice') {
      return 'La boleta o factura se emite al finalizar la compra en el checkout, o desde tu pedido. Elige boleta con DNI o factura con RUC.';
    }
    if (intent === 'contact') {
      return 'Puedes escribirnos en /contacto o a info@lamerced.com. Horario de tienda: lunes a sábado, 9:00 a.m. a 8:00 p.m.';
    }
    if (intent === 'products') {
      return this.productFallback(message);
    }

    const faqMatch = await this.matchFaq(message);
    if (faqMatch) return faqMatch;

    return 'Puedo ayudarte con el catálogo, horarios, formas de pago o el seguimiento de un pedido. ¿Qué necesitas?';
  }

  private async productFallback(message: string) {
    const products = await this.findProducts(message);
    if (!products.length) {
      return 'Tenemos calzado, ropa y accesorios. Entra a /catalogo para ver todo el surtido o dime qué buscas (por ejemplo: zapatillas, polos).';
    }

    const lines = products.map((p) => {
      const stock = Number(p.stock_quantity) > 0 ? 'disponible' : 'sin stock';
      return `• ${p.name} — S/ ${p.sale_price} (${stock})`;
    });

    return `Esto es lo que encontré:\n${lines.join('\n')}\n\nSi buscas algo más específico, dime el nombre o la talla.`;
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
      .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
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
