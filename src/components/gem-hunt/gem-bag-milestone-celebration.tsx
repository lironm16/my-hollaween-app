"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { ImpMarkerGlyph } from "@/components/imp-marker-glyph";
import type { GemBagCelebrateKind } from "@/lib/gem-bag-celebrate";
import { cn } from "@/lib/utils";

const COPY: Record<
  GemBagCelebrateKind,
  { title: string; sub: string; kicker: string }
> = {
  map: {
    kicker: "כל השדונים על המפה",
    title: "השכונה שלכם מלאה קסם!",
    sub: "מצאתם את כל השדונים הנסתרים — התיק מוכן לפסגה.",
  },
  album: {
    kicker: "האוסף הושלם",
    title: "כל השדונים באוסף!",
    sub: "מצאתם את כל השדונים — אין עוד סימני שאלה.",
  },
  "map-album": {
    kicker: "פסגה כפולה",
    title: "מפה מלאה + אוסף שלם!",
    sub: "שדון אחרון, שדון אחרון — כל הכבוד, ציידי הקסם.",
  },
};

const FADE_OUT_MS = 280;

/** Full-screen beat after the sticker fly-in lands on a milestone collect — stays until dismissed. */
export function GemBagMilestoneCelebration({
  kind,
  onDone,
}: {
  kind: GemBagCelebrateKind;
  onDone: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const dismissedRef = useRef(false);
  const copy = COPY[kind];

  const finish = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    setVisible(false);
    window.setTimeout(onDone, FADE_OUT_MS);
  }, [onDone]);

  useEffect(() => {
    dismissedRef.current = false;
    const enter = window.requestAnimationFrame(() => setVisible(true));
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([30, 50, 80, 50, 120]);
    }
    return () => {
      window.cancelAnimationFrame(enter);
    };
  }, [kind]);

  return (
    <div
      className={cn(
        "gem-bag-milestone fixed inset-0 z-[200] flex items-center justify-center px-4",
        visible && "is-visible",
      )}
      role="dialog"
      aria-modal="true"
      aria-live="assertive"
      aria-label={copy.title}
      dir="rtl"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          finish();
        }
      }}
    >
      <div className="gem-bag-milestone__backdrop" aria-hidden onClick={finish} />
      <div className="gem-bag-milestone__burst" aria-hidden />
      <div className="gem-bag-milestone__card">
        <button
          type="button"
          className="gem-bag-milestone__close absolute start-3 top-3 flex size-10 items-center justify-center rounded-full text-violet-200/90 ring-1 ring-violet-400/30 hover:bg-violet-950/40"
          aria-label="סגירה"
          onClick={finish}
        >
          <X className="size-5" aria-hidden />
        </button>
        <Sparkles className="gem-bag-milestone__spark size-8 text-amber-300" aria-hidden />
        <ImpMarkerGlyph className="gem-bag-milestone__gem size-10 text-violet-200" />
        <p className="gem-bag-milestone__kicker">{copy.kicker}</p>
        <h2 className="gem-bag-milestone__title">{copy.title}</h2>
        <p className="gem-bag-milestone__sub">{copy.sub}</p>
        <button
          type="button"
          className="gem-bag-milestone__dismiss mt-4 rounded-full bg-amber-400 px-6 py-2.5 text-base font-medium text-black hover:bg-amber-300"
          onClick={finish}
        >
          סגירה
        </button>
      </div>
    </div>
  );
}
