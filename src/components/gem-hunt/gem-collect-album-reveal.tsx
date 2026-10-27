"use client";

import Image from "next/image";
import { useMemo } from "react";
import { useGemCopy } from "@/hooks/use-gem-copy";
import { useLocale } from "@/hooks/use-locale";
import { gemAlbumStickerPool, gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import { cn } from "@/lib/utils";

/** Camera overlay after collect — pet flies into the sticker book. */
export function GemCollectAlbumReveal({
  monsterId,
  phase,
  newAlbumFriend = true,
  showActions = false,
  onOpenStickerBook,
  onClose,
}: {
  monsterId: GemMonsterId;
  /** `enter` starts fly-in; `landed` holds the placed sticker. */
  phase: "enter" | "landed";
  /** False when this monster type was already in the sticker book. */
  newAlbumFriend?: boolean;
  showActions?: boolean;
  onOpenStickerBook?: () => void;
  onClose?: () => void;
}) {
  const { t } = useLocale();
  const gemCopy = useGemCopy();
  const meta = gemMonsterMeta(monsterId);
  const label = gemCopy.petLabel(monsterId);
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

  const bookLabel = newAlbumFriend ? t("gem.albumRevealAdded") : t("gem.albumRevealRepeat");
  const showFly = newAlbumFriend;

  return (
    <div className="gem-collect-album-reveal" role="status" aria-live="polite">
      <div className="gem-collect-album-reveal__shade" aria-hidden />
      <div className="gem-collect-album-reveal__content">
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

        <div className="gem-collect-album-reveal__book" aria-label={t("menu.gemAlbum")}>
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

        {showActions && newAlbumFriend ? (
          <div className="gem-collect-album-reveal__actions">
            <button
              type="button"
              className="gem-collect-album-reveal__action gem-collect-album-reveal__action--primary"
              onClick={onOpenStickerBook}
            >
              {t("menu.gemAlbum")}
            </button>
            <button
              type="button"
              className="gem-collect-album-reveal__action gem-collect-album-reveal__action--ghost"
              onClick={onClose}
            >
              {t("common.close")}
            </button>
          </div>
        ) : (
          <p className="gem-collect-album-reveal__foot">
            {phase === "landed" || !newAlbumFriend
              ? newAlbumFriend
                ? showActions
                  ? ""
                  : "שמור באוסף — ממשיכים לצוד!"
                : "שדון נוסף לבית — כבר אצלכם באוסף!"
              : "מדביקים…"}
          </p>
        )}
      </div>
    </div>
  );
}
