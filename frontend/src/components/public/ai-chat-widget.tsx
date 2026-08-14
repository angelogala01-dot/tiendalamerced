'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, MessageCircle, Send, X } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { chatbotService } from '@/services/catalog.service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Message = { role: 'user' | 'assistant'; content: string };

const SESSION_KEY = 'lamerced-ai-session';
const WELCOME: Message = {
  role: 'assistant',
  content:
    '¡Hola! Soy el asistente de La Merced PyK. Pregúntame por productos, horarios, pagos o el estado de un pedido.',
};

const SUGGESTIONS = [
  { label: 'Productos', message: '¿Qué productos tienen disponibles?' },
  { label: 'Horarios', message: '¿Cuál es el horario de atención?' },
  { label: 'Pagos', message: '¿Qué métodos de pago aceptan?' },
  { label: 'Mi pedido', message: 'Quiero consultar el estado de un pedido' },
] as const;

function getSessionId() {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export function AiChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userTurns = messages.filter((m) => m.role === 'user').length;

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 80);
      return () => window.clearTimeout(id);
    }
  }, [open]);

  if (pathname === PUBLIC_ROUTES.CHAT) return null;

  async function sendMessage(raw: string) {
    const msg = raw.trim();
    if (!msg || loading || !sessionId) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await chatbotService.send(msg, sessionId);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: 'No pude responder ahora. Prueba de nuevo o escríbenos en Contacto.',
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open ? (
        <section
          className="pointer-events-auto flex h-[min(32rem,74vh)] w-[min(22.5rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border/80"
          aria-label="Asistente virtual"
        >
          <header className="flex items-center justify-between gap-3 bg-foreground px-4 py-3 text-background">
            <div className="flex items-center gap-2.5">
              <span className="relative flex size-9 items-center justify-center rounded-full bg-accent/20 text-accent">
                <Bot className="size-4" aria-hidden />
                <span className="absolute bottom-0.5 right-0.5 size-2.5 rounded-full bg-emerald-400 ring-2 ring-foreground" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-none">Asistente La Merced</p>
                <p className="mt-1 text-[11px] text-background/60">En línea · catálogo y pedidos</p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-background hover:bg-background/10 hover:text-background"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
            >
              <X className="size-4" />
            </Button>
          </header>

          <div
            ref={listRef}
            className="flex-1 space-y-3 overflow-y-auto bg-background/80 p-3"
            role="log"
            aria-live="polite"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  m.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground',
                )}
              >
                {m.content}
              </div>
            ))}
            {loading ? (
              <div className="flex w-fit items-center gap-1 rounded-2xl bg-muted px-3 py-2.5" aria-label="Escribiendo">
                <span className="size-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.2s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-foreground/50 [animation-delay:-0.1s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-foreground/50" />
              </div>
            ) : null}
          </div>

          {userTurns < 2 && !loading ? (
            <div className="flex flex-wrap gap-1.5 border-t border-border/50 bg-card px-3 pt-2.5">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => void sendMessage(item.message)}
                  className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/80 transition hover:border-accent hover:text-accent"
                >
                  {item.label}
                </button>
              ))}
            </div>
          ) : null}

          <form onSubmit={send} className="flex gap-2 bg-card p-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta…"
              maxLength={800}
              disabled={loading}
              aria-label="Mensaje"
              className="rounded-xl"
            />
            <Button type="submit" size="icon" className="shrink-0 rounded-xl" disabled={loading || !input.trim()}>
              <Send className="size-4" aria-hidden />
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </section>
      ) : (
        <Button
          type="button"
          size="icon-lg"
          className="pointer-events-auto size-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90"
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente virtual"
          aria-expanded={false}
        >
          <MessageCircle className="size-6" />
        </Button>
      )}
    </div>
  );
}
