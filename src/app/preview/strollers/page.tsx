import { STROLLER_OPTIONS } from "@/components/stroller-glyphs";
import { PreviewNav, PreviewPhoto } from "@/components/preview-nav";
import { config } from "@/lib/config";

export default function StrollerPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · בחירת אייקון</p>
          <h1 className="text-2xl font-semibold text-orange-100">איזה עגלה יותר ברורה?</h1>
          <p className="text-base text-violet-200">
            בפופאפ עכשיו: מספר 1, העגלה מהתמונה. כתבו מספר אחר אם תרצו להחליף.
          </p>
          <PreviewNav current="/preview/strollers" />
        </header>

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
                    <p className="text-base text-violet-300">{option.blurb}</p>
                  </div>
                  {option.current ? (
                    <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-base font-medium text-black">
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
                    className="inline-flex size-10 items-center justify-center overflow-hidden rounded-full bg-[#22d3ee]"
                    title="תג ברשימה"
                  >
                    <span className="size-8">
                      <Glyph />
                    </span>
                  </span>
                  <div className="relative size-[58px]">
                    <div className="absolute start-[10px] top-[10px] grid size-[38px] place-items-center rounded-full bg-[#047857] text-[22px] leading-none ring-[2.5px] ring-[#fff7ed]">
                      🎃
                    </div>
                    <span className="absolute -start-0.5 -top-0.5 grid size-7 place-items-center overflow-hidden rounded-full bg-[#22d3ee]">
                      <span className="size-6">
                        <Glyph />
                      </span>
                    </span>
                  </div>
                </div>
                <p className="text-base text-violet-400">גדול · תג · סיכה</p>
              </section>
            );
          })}
        </div>

        <PreviewPhoto src="/preview/stroller-icon-options.png" alt="שש אפשרויות לאייקון עגלה" />
      </div>
    </div>
  );
}
