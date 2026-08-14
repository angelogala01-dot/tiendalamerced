'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Bot, User, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useApi } from '@/hooks/use-api';
import type { FaqEntry } from '@/types';
import { PageHeader } from '@/components/admin/page-header';
import { DataTableShell } from '@/components/admin/data-table-shell';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { chatbotService } from '@/services/catalog.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

type Message = { role: 'user' | 'assistant'; content: string };

type FaqForm = { question: string; answer: string; category: string; is_active: boolean };

const emptyFaq: FaqForm = { question: '', answer: '', category: '', is_active: true };

export default function AdminChatbotPage() {
  const { api } = useApi();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());
  const listRef = useRef<HTMLDivElement>(null);

  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqEntry | null>(null);
  const [deletingFaq, setDeletingFaq] = useState<FaqEntry | null>(null);
  const [faqForm, setFaqForm] = useState<FaqForm>(emptyFaq);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const { data: faqList = [], isLoading: loadingFaq } = useQuery({
    queryKey: ['admin-faq'],
    queryFn: async () => {
      const res = await api<{ data: FaqEntry[] | null }>('/chatbot/faq/admin');
      return res.data ?? [];
    },
  });

  const saveFaqMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        question: faqForm.question.trim(),
        answer: faqForm.answer.trim(),
        category: faqForm.category.trim() || undefined,
        ...(editingFaq ? { is_active: faqForm.is_active } : {}),
      };
      if (editingFaq) {
        return api(`/chatbot/faq/${editingFaq.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      }
      return api('/chatbot/faq', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(editingFaq ? 'FAQ actualizada' : 'FAQ creada');
      queryClient.invalidateQueries({ queryKey: ['admin-faq'] });
      setFaqDialogOpen(false);
      setEditingFaq(null);
      setFaqForm(emptyFaq);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteFaqMutation = useMutation({
    mutationFn: (id: string) => api(`/chatbot/faq/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('FAQ eliminada');
      queryClient.invalidateQueries({ queryKey: ['admin-faq'] });
      setDeleteOpen(false);
      setDeletingFaq(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  async function testChat(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isSending) return;
    const msg = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: msg }]);
    setIsSending(true);
    try {
      const res = await chatbotService.send(msg, sessionId);
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="admin-page-enter mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Chat Bot"
        description="Prueba el asistente con IA (OpenAI). Las FAQ activas se usan como contexto de las respuestas."
      />

      <Card className="admin-card flex flex-col border-0 overflow-hidden">
        <CardHeader className="border-b border-border/60">
          <CardTitle className="text-base font-semibold">Probar respuestas</CardTitle>
          <CardDescription>
            Simula conversaciones. El asistente usa GPT con el catálogo y las FAQ de la tienda.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 p-0">
          <div
            ref={listRef}
            className="flex max-h-80 min-h-48 flex-col gap-3 overflow-y-auto p-4 sm:p-6"
            role="log"
            aria-live="polite"
            aria-label="Historial de conversación"
          >
            {messages.length === 0 ? (
              <p className="m-auto text-center text-sm text-muted-foreground">
                Escribe un mensaje para iniciar la prueba
              </p>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex gap-2.5 text-sm',
                    m.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                  )}
                >
                  <div
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full',
                      m.role === 'user' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                    )}
                    aria-hidden
                  >
                    {m.role === 'user' ? <User className="size-3.5" /> : <Bot className="size-3.5" />}
                  </div>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-2.5',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))
            )}
            {isSending ? (
              <p className="text-center text-xs text-muted-foreground" aria-live="polite">
                El asistente está escribiendo...
              </p>
            ) : null}
          </div>

          <form
            onSubmit={testChat}
            className="flex gap-2 border-t border-border/60 p-4 sm:p-6"
            aria-label="Enviar mensaje de prueba"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe un mensaje de prueba..."
              className="rounded-xl"
              disabled={isSending}
              aria-label="Mensaje"
            />
            <Button type="submit" size="icon" className="shrink-0 rounded-xl" disabled={isSending}>
              <Send className="size-4" aria-hidden />
              <span className="sr-only">Enviar</span>
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Preguntas frecuentes (FAQ)</h2>
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => { setEditingFaq(null); setFaqForm(emptyFaq); setFaqDialogOpen(true); }}
        >
          <Plus className="size-4" aria-hidden />
          Nueva FAQ
        </Button>
      </div>

      <DataTableShell
        title="Listado FAQ"
        isLoading={loadingFaq}
        actions={<Badge variant="outline">{faqList.length} entradas</Badge>}
      >
        {faqList.length ? (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Pregunta</TableHead>
                <TableHead scope="col">Categoría</TableHead>
                <TableHead scope="col">Estado</TableHead>
                <TableHead scope="col" className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {faqList.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell>
                    <p className="font-medium">{faq.question}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{faq.answer}</p>
                  </TableCell>
                  <TableCell>{faq.category ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={faq.is_active ? 'default' : 'secondary'}>
                      {faq.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => {
                          setEditingFaq(faq);
                          setFaqForm({
                            question: faq.question,
                            answer: faq.answer,
                            category: faq.category ?? '',
                            is_active: faq.is_active,
                          });
                          setFaqDialogOpen(true);
                        }}
                        aria-label={`Editar FAQ: ${faq.question}`}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => { setDeletingFaq(faq); setDeleteOpen(true); }}
                        aria-label={`Eliminar FAQ: ${faq.question}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin entradas FAQ.</p>
        )}
      </DataTableShell>

      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq ? 'Editar FAQ' : 'Nueva FAQ'}</DialogTitle>
            <DialogDescription>Pregunta y respuesta del asistente.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!faqForm.question.trim() || !faqForm.answer.trim()) {
                toast.error('Pregunta y respuesta son obligatorias');
                return;
              }
              saveFaqMutation.mutate();
            }}
            className="grid gap-4"
          >
            <div className="space-y-2">
              <Label htmlFor="faq-question">Pregunta</Label>
              <Input id="faq-question" value={faqForm.question} onChange={(e) => setFaqForm((f) => ({ ...f, question: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer">Respuesta</Label>
              <textarea
                id="faq-answer"
                value={faqForm.answer}
                onChange={(e) => setFaqForm((f) => ({ ...f, answer: e.target.value }))}
                rows={3}
                required
                className="flex min-h-[80px] w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-category">Categoría</Label>
              <Input id="faq-category" value={faqForm.category} onChange={(e) => setFaqForm((f) => ({ ...f, category: e.target.value }))} />
            </div>
            {editingFaq ? (
              <div className="flex items-center gap-2">
                <input
                  id="faq-active"
                  type="checkbox"
                  checked={faqForm.is_active}
                  onChange={(e) => setFaqForm((f) => ({ ...f, is_active: e.target.checked }))}
                  className="size-4 rounded border-input"
                />
                <Label htmlFor="faq-active">Entrada activa</Label>
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFaqDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saveFaqMutation.isPending}>Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar FAQ"
        description={`¿Eliminar "${deletingFaq?.question}"?`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteFaqMutation.isPending}
        onConfirm={() => {
          if (deletingFaq) deleteFaqMutation.mutate(deletingFaq.id);
        }}
      />
    </div>
  );
}
