'use client';

import { usePathname } from 'next/navigation';
import { useState, type ComponentType } from 'react';
import { MessageCircle } from 'lucide-react';
import { PUBLIC_ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';

type ChatWidget = ComponentType<{ initialOpen?: boolean }>;

export function AiChatLazy() {
  const pathname = usePathname();
  const [Widget, setWidget] = useState<ChatWidget | null>(null);
  const [loading, setLoading] = useState(false);

  if (pathname === PUBLIC_ROUTES.CHAT) return null;
  if (Widget) return <Widget initialOpen />;

  async function open() {
    if (loading) return;
    setLoading(true);
    const mod = await import('@/components/public/ai-chat-widget');
    setWidget(() => mod.AiChatWidget);
    setLoading(false);
  }

  return (
    <Button
      type="button"
      size="icon-lg"
      className="fixed bottom-4 right-4 z-40 size-14 rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 sm:bottom-6 sm:right-6"
      onClick={() => void open()}
      aria-label="Abrir asistente virtual"
      disabled={loading}
    >
      <MessageCircle className="size-6" />
    </Button>
  );
}
