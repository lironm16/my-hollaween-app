"use client";

import { useState } from "react";
import { EventCountdownFinale } from "@/components/event-countdown-finale";
import { PreviewNav } from "@/components/preview-nav";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/config";

function MapShellPreview() {
  return (
    <div className="relative flex h-[520px] flex-col overflow-hidden rounded-[1.5rem] bg-[#14091c]">
      <div className="border-b border-orange-500/20 px-3 py-2 text-center text-xs text-violet-300">
        מפת השכונה (דמו)
      </div>
      <div className="relative min-h-0 flex-1 bg-[#1a1024]">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute left-[18%] top-[22%] size-3 rounded-full bg-orange-400/80" />
          <div className="absolute left-[52%] top-[38%] size-3 rounded-full bg-orange-400/80" />
          <div className="absolute left-[70%] top-[58%] size-3 rounded-full bg-orange-400/80" />
          <div className="absolute left-[34%] top-[66%] size-3 rounded-full bg-orange-400/80" />
        </div>
        <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-violet-400/70">
          המפה ממשיכה לעבוד מתחת
        </p>
      </div>
    </div>
  );
}

export default function CountdownFinalePreviewPage() {
  const [showFinale, setShowFinale] = useState(true);

  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6 pb-16">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · finale dock</p>
          <h1 className="font-display text-2xl text-orange-100">סיום ספירה · 17:00</h1>
          <p className="text-base leading-relaxed text-violet-200">
            אחרי 00:00:00 — באנר קצר (~3.2 שניות) עם X לסגירה מיידית, ואז הכל יורד מהזיכרון.
          </p>
          <PreviewNav current="/preview/countdown-finale" />
        </header>

        <div className="overflow-hidden rounded-[2rem] bg-[#0a0610] p-2 ring-1 ring-orange-500/30">
          <div className="overflow-hidden rounded-[1.5rem] bg-[#14091c]">
            <MapShellPreview />
            {showFinale ? (
              <EventCountdownFinale onDone={() => setShowFinale(false)} />
            ) : (
              <div className="border-t border-orange-500/15 px-4 py-3 text-center text-sm text-violet-400">
                Finale dismissed — dock removed
              </div>
            )}
          </div>
        </div>

        <Button type="button" onClick={() => setShowFinale(true)} className="w-full bg-orange-500 text-black hover:bg-orange-400">
          הצג שוב את ה-finale
        </Button>
      </div>
    </div>
  );
}
