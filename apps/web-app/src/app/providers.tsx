"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { initializeLanguage } from "@/lib/i18n";
import { getQueryClient } from "@/lib/query-client";

export function Providers({ children }: PropsWithChildren) {
  const [queryClient] = useState(getQueryClient);

  useEffect(() => {
    // ponytail: browser preferences wait until hydration so SSR and client markup agree.
    void initializeLanguage();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
