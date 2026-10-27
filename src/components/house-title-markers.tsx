"use client";

import { Heart } from "lucide-react";
import { GemDiamondSvg } from "@/components/gem-diamond-icon";
import { useLocale } from "@/hooks/use-locale";

/** Heart / diamond before house name — list, map sheet, route tail, cluster rows. */
export function HouseTitleMarkers({
  liked,
  gemCollected,
}: {
  liked?: boolean;
  gemCollected?: boolean;
}) {
  const { t } = useLocale();
  if (!liked && !gemCollected) return null;
  return (
    <>
      {liked ? (
        <Heart
          className="me-1.5 inline size-6 fill-current text-[#fb7185] align-middle"
          strokeWidth={2.2}
          aria-label={t("traffic.liked")}
        />
      ) : null}
      {gemCollected ? (
        <>
          <GemDiamondSvg className="me-1.5 size-6 align-middle" aria-hidden />
          <span className="sr-only">{t("traffic.imp")}</span>
        </>
      ) : null}
    </>
  );
}
