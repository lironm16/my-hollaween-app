"use client";

import Image from "next/image";
import { useMemo } from "react";
import { Sparkles } from "lucide-react";
import {
  gemAlbumStickerPool,
  gemLabelHe,
  gemMonsterMeta,
  type GemMonsterId,
} from "@/lib/gem-monsters";
import { cn } from "@/lib/utils";

/** Camera overlay after collect — pet flies into the sticker book. */
export function GemCollectAlbumReveal({
  monsterId,
  phase,
}: {
  monsterId: GemMonsterId;
  /** `enter` starts fly-in; `landed` holds the placed sticker. */
  phase: "enter" | "landed";
}) {
  const meta = gemMonsterMeta(monsterId);
  const label = gemLabelHe(monsterId);
  const pool = gemAlbumStickerPool();
  const slotIndex = useMemo(
    () => pool.findIndex((entry) => entry.id === monsterId),
    [pool, monsterId],
  );

  const previewSlots = useMemo(() => {
    if (pool.length <= 4) return [...pool];
    if (slotIndex < 0) return pool.slice(0, 4);
    const start = Math.max(0, Math.min(slotIndex - 1, pool.length - 4));
    return pool.slice(start, start + 4);
  }, [pool, slotIndex]);

  return (
    <div className="gem-collect-album-reveal" role="status" aria-live="polite">
      <div className="gem-collect-album-reveal__shade" aria-hidden />
      <div className="gem-collect-album-reveal__content">
        <p className="gem-collect-album-reveal__kicker">
          <Sparkles className="inline size-4 text-amber-300" aria-hidden /> מצאתם חבר חדש!
        </p>
        <h2 className="gem-collect-album-reveal__title">{label}</h2>

        <div
          className={cn(
            "gem-collect-album-reveal__fly",
            phase === "enter" && "is-entering",
            phase === "landed" && "is-landed",
          )}
          aria-hidden={phase === "landed"}
        >
          <Image
            src={meta.posterPath}
            alt=""
            width={220}
            height={220}
            className="gem-collect-album-reveal__fly-art"
            priority
          />
        </div>

        <div className="gem-collect-album-reveal__book" aria-label="ספר מדבקות">
          <p className="gem-collect-album-reveal__book-label">נכנס לספר המדבקות</p>
          <div className="gem-collect-album-reveal__grid">
            {previewSlots.map((entry) => {
              const isNew = entry.id === monsterId;
              const placed = isNew && phase === "landed";
              return (
                <div
                  key={entry.id}
                  className={cn(
                    "gem-collect-album-reveal__slot",
                    isNew && "is-target",
                    placed && "is-placed",
                  )}
                >
                  {placed ? (
                    <>
                      <Image
                        src={entry.posterPath}
                        alt=""
                        width={120}
                        height={120}
                        className="gem-collect-album-reveal__slot-art"
                      />
                      <span className="gem-collect-album-reveal__slot-shine" aria-hidden />
                    </>
                  ) : (
                    <span className="gem-collect-album-reveal__slot-mystery" aria-hidden>
                      ?
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="gem-collect-album-reveal__foot">
          {phase === "landed" ? "שמור בטוח בספר — ממשיכים לצוד!" : "מדביקים…"}
        </p>
      </div>
    </div>
  );
}
