"use client";

import { config } from "@/lib/config";
import { cn } from "@/lib/utils";
import { useLocale } from "@/hooks/use-locale";

export function PersistNote({ className }: { className?: string }) {
  const { t } = useLocale();
  if (config.durableWrites) return null;
  return (
    <p
      className={cn(
        "rounded-xl bg-amber-950/50 px-3 py-2 text-base text-amber-100 ring-1 ring-amber-500/25",
        className,
      )}
    >
      {t("persistNote.localOnly")}
    </p>
  );
}
