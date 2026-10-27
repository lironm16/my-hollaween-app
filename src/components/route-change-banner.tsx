"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, X } from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { localizedRouteChangeBannerMessage } from "@/lib/i18n/route-change-copy";
import type { RouteStatusChangeEntry } from "@/lib/route-changes";
import { cn } from "@/lib/utils";

export function routeChangeBannerMessage(
  locale: Parameters<typeof localizedRouteChangeBannerMessage>[0],
  changes: RouteStatusChangeEntry[],
  fromBackground = false,
): string {
  return localizedRouteChangeBannerMessage(locale, changes, fromBackground);
}

export function RouteChangeBanner({
  changes,
  fromBackground = false,
  onOpen,
  onDismiss,
}: {
  changes: RouteStatusChangeEntry[];
  fromBackground?: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  const { dir, locale, t } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || changes.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+7.25rem)] z-[55] px-3"
      dir={dir}
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-xl bg-amber-950/95 px-3 py-2.5 text-base text-amber-50 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-amber-500/35 backdrop-blur-sm">
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 text-start leading-snug"
          onClick={onOpen}
        >
          <span className="min-w-0 flex-1">
            {localizedRouteChangeBannerMessage(locale, changes, fromBackground)}
          </span>
          <ChevronLeft
            className={cn(
              "size-4 shrink-0 opacity-80",
              dir === "ltr" && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-amber-100/90 hover:bg-amber-900/60"
          aria-label={t("routeChanges.dismissAria")}
          onClick={onDismiss}
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>,
    document.body,
  );
}
