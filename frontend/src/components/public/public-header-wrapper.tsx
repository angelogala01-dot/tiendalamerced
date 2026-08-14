'use client';

import { PublicHeader } from './public-header';
import { useCart } from '@/providers/cart-provider';

export function PublicHeaderWrapper() {
  const { itemCount } = useCart();
  return <PublicHeader cartCount={itemCount} />;
}
