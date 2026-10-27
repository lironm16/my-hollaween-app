"use client";

import { ImpMarkerGlyph } from "@/components/imp-marker-glyph";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

/** Top section on the sticker bag — album progress only (no separate **diamond** count). */
export function GemBagDiamondHero({
  filledCount,
  totalSlots,
  complete,
  className,
}: {
  filledCount: number;
  totalSlots: number;
  complete: boolean;
  className?: string;
}) {
  const { dir, t } = useLocale();
  const progressPct = totalSlots > 0 ? Math.round((filledCount / totalSlots) * 100) : 0;
  const remaining = Math.max(0, totalSlots - filledCount);

  return (
    <header
      className={cn("gem-bag-hero gem-bag-diamond-hero", complete && "gem-bag-hero--complete", className)}
      dir={dir}
    >
      <div className="gem-bag-hero__head">
        <ImpMarkerGlyph
          variant="solid"
          className="size-20 shrink-0 text-[#fbbf24] drop-shadow-[0_0_12px_rgb(251_191_36/0.5)]"
          aria-hidden
        />
        <div className="min-w-0 flex-1 text-start">
          <h1 className="font-display text-2xl text-orange-200">{t("menu.gemAlbum")}</h1>
          <p className="mt-1 text-lg font-medium text-violet-50">
            <span className="text-amber-200">{filledCount}</span>
            <span className="text-violet-200/90"> {t("gem.albumSlots")} · </span>
            <span className="text-violet-300">
              {formatMessage(t("gem.albumMoreToFind"), { n: String(remaining) })}
            </span>
          </p>
        </div>
        <div className="gem-bag-progress-ring" aria-hidden>
          <span className="gem-bag-progress-ring__value">{progressPct}%</span>
        </div>
      </div>
      <div
        className="gem-bag-progress-bar"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={formatMessage(t("gem.albumProgressAria"), {
          filled: String(filledCount),
          total: String(totalSlots),
        })}
      >
        <div className="gem-bag-progress-bar__fill" style={{ width: `${progressPct}%` }} />
      </div>
      {complete ? (
        <p className="gem-bag-hero__celebrate">
          <ImpMarkerGlyph
            variant="solid"
            className="inline-block size-5 align-middle text-[#fbbf24]"
            aria-hidden
          />{" "}
          {t("gem.albumAllCelebrate")}
        </p>
      ) : null}
    </header>
  );
}
