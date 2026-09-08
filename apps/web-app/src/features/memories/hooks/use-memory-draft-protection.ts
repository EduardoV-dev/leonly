"use client";

import { useEffect, useEffectEvent } from "react";

type UseMemoryDraftProtectionOptions = {
  isDirty: boolean;
  message: string;
  onDiscard: () => void;
};

export function useMemoryDraftProtection({
  isDirty,
  message,
  onDiscard,
}: UseMemoryDraftProtectionOptions): void {
  const discardDraft = useEffectEvent(onDiscard);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    const handleLinkClick = (event: MouseEvent) => {
      if (!isDirty || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;

      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.download || link.target === "_blank") return;
      if (link.hash && link.pathname === window.location.pathname) return;
      if (!window.confirm(message)) {
        event.preventDefault();
        return;
      }

      discardDraft();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [isDirty, message]);
}
