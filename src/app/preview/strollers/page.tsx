import Link from "next/link";
import { STROLLER_OPTIONS } from "@/components/stroller-glyphs";
import { config } from "@/lib/config";

export default function StrollerPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-2">
          <p className="text-xs text-violet-300">{config.appName} · בחירת אייקון</p>
          <h1 className="text-2xl font-semibold text-orange-100">איזה עגלה יותר ברורה?</h1>
          <p className="text-sm text-violet-200">
            שש צורות. המפה עדיין עם מספר 1. כתבו לי מספר — או שם — ונחליף.
          </p>
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/" className="text-orange-300 underline-offset-2 hover:underline">
              חזרה למפה
            </Link>
            <Link href="/preview/candies" className="text-orange-300 underline-offset-2 hover:underline">
              ממתקים
            </Link>
            <Link href="/preview/scare" className="text-orange-300 underline-offset-2 hover:underline">
              פחד
            </Link>
          </div>
        </header>

        <figure className="overflow-hidden rounded-2xl ring-1 ring-orange-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/preview/stroller-icon-options.png"
            alt="שש אפשרויות לאייקון עגלה"
            className="h-auto w-full"
          />
        </figure>

        <div className="space-y-3">
          {STROLLER_OPTIONS.map((option) => {
            const Glyph = option.Glyph;
            return (
              <section
                key={option.id}
                id={option.id}
                className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-medium text-orange-100">
                      {option.number}. {option.name}
                    </h2>
                    <p className="text-xs text-violet-300">{option.blurb}</p>
                  </div>
                  {option.current ? (
                    <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-medium text-black">
                      בפופאפ עכשיו
                    </span>
                  ) : null}
                </div>
                <div className="flex items-end justify-between gap-4">
                  <div className="flex size-20 items-center justify-center rounded-2xl bg-[#fff7ed] text-[#1c0e24]">
                    <div className="size-14">
                      <Glyph />
                    </div>
                  </div>
                  <span
                    className="inline-flex size-10 items-center justify-center rounded-full bg-[#fff7ed] text-[#1c0e24] ring-2 ring-[#1c0e24]"
                    title="תג ברשימה"
                  >
                    <span className="size-6">
                      <Glyph />
                    </span>
                  </span>
                  <div className="relative size-[58px]">
                    <div className="absolute start-[10px] top-[10px] grid size-[38px] place-items-center rounded-full bg-[#047857] text-[22px] leading-none ring-[2.5px] ring-[#fff7ed]">
                      🎃
                    </div>
                    <span className="absolute -start-0.5 -top-0.5 grid size-7 place-items-center rounded-full bg-[#fff7ed] text-[#1c0e24] ring-[2.5px] ring-[#1c0e24]">
                      <span className="size-[18px]">
                        <Glyph />
                      </span>
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-violet-400">גדול · תג · סיכה</p>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
