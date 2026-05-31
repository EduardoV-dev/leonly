'use client';

import '@/lib/i18n';
import { QueryProvider } from '@/providers/QueryProvider';
import type { PropsWithChildren } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: PropsWithChildren) {
  return (
    <QueryProvider>
      {children}
      <Toaster richColors position="top-right" />
    </QueryProvider>
  );
}
