"use client";

import { useRef, type ImgHTMLAttributes, type PointerEvent } from "react";
import type { PhotoFocus } from "@/lib/compress-image";
import { cn } from "@/lib/utils";

/** Same square the list cards and map details use for a house photo. */
export const HOUSE_CARD_PHOTO_BOX =
  "h-32 w-32 shrink-0 overflow-hidden rounded-xl ring-1 ring-orange-500/25";

export function clampPhotoFocus(focus: PhotoFocus): PhotoFocus {
  return {
    x: Math.min(100, Math.max(0, focus.x)),
    y: Math.min(100, Math.max(0, focus.y)),
  };
}

export function photoObjectPosition(focus?: PhotoFocus | null) {
  const next = clampPhotoFocus(focus ?? { x: 50, y: 50 });
  return `${next.x}% ${next.y}%`;
}

export function HousePhotoFrame({
  src,
  alt = "",
  focus,
  onFocusChange,
  className,
  imgClassName,
  loading,
  onError,
}: {
  src: string;
  alt?: string;
  focus?: PhotoFocus | null;
  onFocusChange?: (focus: PhotoFocus) => void;
  className?: string;
  imgClassName?: string;
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
  onError?: () => void;
}) {
  const drag = useRef<{
    pointerId: number;
    x: number;
    y: number;
    focus: PhotoFocus;
    w: number;
    h: number;
  } | null>(null);
  const editable = Boolean(onFocusChange);
  const pos = photoObjectPosition(focus);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!onFocusChange || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    drag.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      focus: clampPhotoFocus(focus ?? { x: 50, y: 50 }),
      w: rect.width,
      h: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!onFocusChange || !drag.current) return;
    if (event.pointerId !== drag.current.pointerId) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    onFocusChange(
      clampPhotoFocus({
        x: drag.current.focus.x - (dx / Math.max(1, drag.current.w)) * 100,
        y: drag.current.focus.y - (dy / Math.max(1, drag.current.h)) * 100,
      }),
    );
  }

  function endDrag(event: PointerEvent<HTMLDivElement>) {
    if (!drag.current || event.pointerId !== drag.current.pointerId) return;
    drag.current = null;
  }

  return (
    <div
      className={cn(
        HOUSE_CARD_PHOTO_BOX,
        editable && "cursor-grab touch-none active:cursor-grabbing",
        className,
      )}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        loading={loading}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={onError}
        className={cn("pointer-events-none h-full w-full object-cover", imgClassName)}
        style={{ objectPosition: pos }}
      />
    </div>
  );
}
