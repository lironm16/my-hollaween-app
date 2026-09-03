import Link from "next/link";
import { DECOR_OPTIONS, DECOR_TONES, DecorSign } from "@/components/decor-glyphs";
import { config } from "@/lib/config";

export default function DecorPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-2">
          <p className="text-xs text-violet-300">{config.appName} · בחירת אייקון</p>
          <h1 className="text-2xl font-semibold text-orange-100">איזה קישוט יותר ברור?</h1>
          <p className="text-sm text-violet-200">
            כתום = הבית מקושט, אפור עם קו = לא מקושט. בפופאפ עכשיו: מספר 3, קורי עכביש.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="text-orange-300 underline-offset-2 hover:underline">
              חזרה למפה
            </Link>
            <Link href="/preview/candies" className="text-orange-300 underline-offset-2 hover:underline">
              ממתקים
            </Link>
            <Link href="/preview/strollers" className="text-orange-300 underline-offset-2 hover:underline">
              עגלות
            </Link>
            <Link href="/preview/scare" className="text-orange-300 underline-offset-2 hover:underline">
              פחד
            </Link>
          </div>
        </header>

        <figure className="overflow-hidden rounded-2xl ring-1 ring-orange-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/preview/decor-icon-options.png"
            alt="חמש צורות קישוט במצב מקושט ולא מקושט"
            className="h-auto w-full"
          />
        </figure>

        <div className="space-y-3">
          {DECOR_OPTIONS.map((option) => {
            const Glyph = option.Glyph;
            return (
              <section
                key={option.id}
                id={option.id}
                className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-base font-medium text-orange-100">
                    {option.number}. {option.name}
                  </h2>
                  {"current" in option && option.current ? (
                    <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-medium text-black">
                      בפופאפ עכשיו
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {DECOR_TONES.map((tone) => (
                    <div key={tone.id} className="flex flex-col items-center gap-1">
                      <DecorSign Glyph={Glyph} on={tone.id === "on"} className="size-10" />
                      <span className="text-[10px] text-violet-300">{tone.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
