"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import { OverlayCloseButton } from "@/components/overlay-close-button";
import { gemLabelHe, gemMonsterMeta, type GemMonsterId } from "@/lib/gem-monsters";
import { cn } from "@/lib/utils";

/** Full-screen sticker view — drag to move the character art. */
export function GemStickerSpotlight({
  monsterId,
  onClose,
}: {
  monsterId: GemMonsterId;
  onClose: () => void;
}) {
  const meta = gemMonsterMeta(monsterId);
  const label = gemLabelHe(monsterId);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      dragRef.current = {
        x: event.clientX,
        y: event.clientY,
        ox: offset.x,
        oy: offset.y,
      };
    },
    [offset.x, offset.y],
  );

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: drag.ox + (event.clientX - drag.x),
      y: drag.oy + (event.clientY - drag.y),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  return (
    <div
      className="gem-sticker-spotlight fixed inset-0 z-[220] flex flex-col"
      role="dialog"
      aria-label={label}
      dir="rtl"
    >
      <div className="gem-sticker-spotlight__backdrop" aria-hidden onClick={onClose} />
      <OverlayCloseButton
        onClick={onClose}
        className="gem-sticker-spotlight__close absolute start-3 top-3 z-10"
      />
      <p className="relative z-10 px-4 pt-14 text-center font-display text-2xl text-amber-100">
        {label}
      </p>
      <div
        className="gem-sticker-spotlight__stage relative z-10 min-h-0 flex-1 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="gem-sticker-spotlight__art-wrap"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        >
          <Image
            src={meta.posterPath}
            alt=""
            width={480}
            height={480}
            className={cn("gem-sticker-spotlight__art", "select-none")}
            draggable={false}
            priority
          />
        </div>
        <p className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-sm text-violet-300/90">
          גררו כדי להזיז · לחצו מחוץ לדמות לסגירה
        </p>
      </div>
    </div>
  );
}
