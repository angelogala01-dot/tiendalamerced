'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  intensity?: number;
};

/** CSS-only lift — without pointermove/will-change so clicks stay instant. */
export function TiltCard({ children, className }: TiltCardProps) {
  return (
    <div
      className={cn(
        'transition-transform duration-200 ease-out will-change-auto hover:-translate-y-1',
        className,
      )}
    >
      {children}
    </div>
  );
}
