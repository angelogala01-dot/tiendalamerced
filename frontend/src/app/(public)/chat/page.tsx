'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chatbotService } from '@/services/catalog.service';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SESSION_KEY = 'lamerced-ai-session';

const SUGGESTIONS = [
  { label: 'Zapatillas', message: '¿Tienen zapatillas disponibles?' },
  { label: 'Mi pedido', message: 'Quiero consultar el estado de un pedido' },
  { label: 'Envíos', message: '¿Hacen delivery y cuánto cuesta el envío?' },
  { label: 'Promos', message: '¿Hay promociones o descuentos vigentes?' },
  { label: 'Pagos', message: '¿Qué métodos de pago aceptan?' },
] as const;

async function optionalToken() {
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token;
  } catch {
    return undefined;
  }
}

function getSessionId() {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! Puedo buscar productos con precio y stock, seguir un pedido con el número P-… y resolver envíos, pagos u horarios.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const userTurns = messages.filter((m) => m.role === 'user').length;

  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(raw: string) {
    if (!raw.trim() || !sessionId || loading) return;
    const msg = raw.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await chatbotService.send(msg, sessionId, await optionalToken());
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'Servicio no disponible. Escríbenos por contacto.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    await sendMessage(input);
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Atención al cliente</h1>
      <p className="mb-6 text-muted-foreground">
        Pregunta por un modelo, pega tu número de pedido (P-…) o consulta envíos, promociones y
        pagos. Si iniciaste sesión, también puedo listar tus compras.
      </p>
      <Card className="flex h-[480px] flex-col">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4 text-accent" aria-hidden />
            Asistente virtual
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto" role="log" aria-live="polite">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-lg px-4 py-2 text-sm',
                  m.role === 'user' ? 'ml-auto bg-primary text-primary-foreground' : 'bg-muted',
                )}
              >
                {m.content}
              </div>
            ))}
            {loading ? (
              <p className="text-xs text-muted-foreground">El asistente está escribiendo…</p>
            ) : null}
          </div>
          {userTurns < 2 && !loading ? (
            <div className="flex flex-wrap gap-1.5">
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
          <form onSubmit={send} className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu mensaje..."
              maxLength={800}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              <Send className="size-4" aria-hidden />
              Enviar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
