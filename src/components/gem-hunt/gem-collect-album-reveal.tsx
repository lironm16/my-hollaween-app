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
  newAlbumFriend = true,
}: {
  monsterId: GemMonsterId;
  /** `enter` starts fly-in; `landed` holds the placed sticker. */
  phase: "enter" | "landed";
  /** False when this monster type was already in the sticker book. */
  newAlbumFriend?: boolean;
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

  const kicker = newAlbumFriend ? "מצאתם חבר חדש!" : "מצאתם שוב את החבר!";
  const bookLabel = newAlbumFriend ? "נכנס לספר המדבקות" : "כבר בספר המדבקות — עוד יהלום!";
  const showFly = newAlbumFriend;

  return (
    <div className="gem-collect-album-reveal" role="status" aria-live="polite">
      <div className="gem-collect-album-reveal__shade" aria-hidden />
      <div className="gem-collect-album-reveal__content">
        <p className="gem-collect-album-reveal__kicker">
          <Sparkles className="inline size-4 text-amber-300" aria-hidden /> {kicker}
        </p>

        {showFly ? (
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
        ) : null}

        <div className="gem-collect-album-reveal__book" aria-label="ספר מדבקות">
          <p className="gem-collect-album-reveal__book-label">{bookLabel}</p>
          <div className="gem-collect-album-reveal__grid">
            {previewSlots.map((entry) => {
              const isNew = entry.id === monsterId;
              const placed = isNew && (newAlbumFriend ? phase === "landed" : true);
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
                      {newAlbumFriend ? (
                        <span className="gem-collect-album-reveal__slot-shine" aria-hidden />
                      ) : null}
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

        <h2 className="gem-collect-album-reveal__title">{label}</h2>

        <p className="gem-collect-album-reveal__foot">
          {phase === "landed" || !newAlbumFriend
            ? newAlbumFriend
              ? "שמור בטוח בספר — ממשיכים לצוד!"
              : "יהלום נוסף לבית — המדבקה כבר אצלכם!"
            : "מדביקים…"}
        </p>
      </div>
    </div>
  );
}
