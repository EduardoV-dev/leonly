"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { type PropsWithChildren, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Toaster } from "sonner";
import { initializeLanguage } from "@/lib/i18n";
import { getQueryClient } from "@/lib/query-client";

export function Providers({ children }: PropsWithChildren) {
  const { t } = useTranslation("auth");
  const [queryClient] = useState(getQueryClient);
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  useEffect(() => {
    // ponytail: browser preferences wait until hydration so SSR and client markup agree.
    void initializeLanguage().finally(() => setIsLanguageReady(true));
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {isLanguageReady ? children : <div aria-label={t("loadingApplication")} role="status" />}
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
