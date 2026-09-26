"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Gem, Sparkles } from "lucide-react";
import type { GemBagCelebrateKind } from "@/lib/gem-bag-celebrate";
import { cn } from "@/lib/utils";

const COPY: Record<
  GemBagCelebrateKind,
  { title: string; sub: string; kicker: string }
> = {
  map: {
    kicker: "כל היהלומים על המפה",
    title: "השכונה שלכם מלאה קסם!",
    sub: "אספתם את כל החבר'ה הנסתרים — התיק מוכן לפסגה.",
  },
  album: {
    kicker: "האלבום הושלם",
    title: "כל החברים באוסף!",
    sub: "מצאתם את כל החבר'ה — אין עוד סימני שאלה.",
  },
  "map-album": {
    kicker: "פסגה כפולה",
    title: "מפה מלאה + אלבום שלם!",
    sub: "יהלום אחרון, חבר אחרון — כל הכבוד, ציידי הקסם.",
  },
};

const AUTO_DISMISS_MS = 2800;
const FADE_OUT_MS = 280;

/** Full-screen beat after the sticker fly-in lands on a milestone collect. */
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
    const auto = window.setTimeout(finish, AUTO_DISMISS_MS);
    return () => {
      window.cancelAnimationFrame(enter);
      window.clearTimeout(auto);
    };
  }, [kind, finish]);

  return (
    <div
      className={cn(
        "gem-bag-milestone fixed inset-0 z-[200] flex items-center justify-center px-4",
        visible && "is-visible",
      )}
      role="dialog"
      aria-live="assertive"
      aria-label={copy.title}
      dir="rtl"
      onClick={finish}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          finish();
        }
      }}
    >
      <div className="gem-bag-milestone__backdrop" aria-hidden />
      <div className="gem-bag-milestone__burst" aria-hidden />
      <div className="gem-bag-milestone__card">
        <Sparkles className="gem-bag-milestone__spark size-8 text-amber-300" aria-hidden />
        <Gem className="gem-bag-milestone__gem size-10 text-violet-200" aria-hidden />
        <p className="gem-bag-milestone__kicker">{copy.kicker}</p>
        <h2 className="gem-bag-milestone__title">{copy.title}</h2>
        <p className="gem-bag-milestone__sub">{copy.sub}</p>
        <p className="gem-bag-milestone__tap">לחצו להמשך</p>
      </div>
    </div>
  );
}
