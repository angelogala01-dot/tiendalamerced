'use client';

import { PublicHeaderWrapper } from '@/components/public/public-header-wrapper';
import { PublicFooter } from '@/components/public/public-footer';
import { AiChatWidget } from '@/components/public/ai-chat-widget';
import { CartProvider } from '@/providers/cart-provider';
import { FavoritesProvider } from '@/providers/favorites-provider';
import { AuthProvider } from '@/providers/auth-provider';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CartProvider>
        <FavoritesProvider>
          <div className="mesh-bg flex min-h-screen flex-col">
            <a
              href="#contenido"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-foreground"
            >
              Saltar al contenido
            </a>
            <PublicHeaderWrapper />
            <main id="contenido" className="flex-1">
              {children}
            </main>
            <PublicFooter />
            <AiChatWidget />
          </div>
        </FavoritesProvider>
      </CartProvider>
    </AuthProvider>
  );
}
