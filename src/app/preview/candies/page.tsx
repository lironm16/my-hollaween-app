import { CANDY_OPTIONS, CANDY_TONES, CandySign } from "@/components/candy-glyphs";
import { PreviewNav, PreviewPhoto } from "@/components/preview-nav";
import { config } from "@/lib/config";

export default function CandyPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · בחירת אייקון</p>
          <h1 className="text-2xl font-semibold text-orange-100">איזה ממתק יותר ברור?</h1>
          <p className="text-base text-violet-200">
            ברשימה: רוח סגולה עם ממתק בפינה (ירוק / כתום / אדום), כמו במפה. אפור עם קו = בלי ממתקים
            מההתחלה.
          </p>
          <PreviewNav current="/preview/candies" />
        </header>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">ברשימה עכשיו</h2>
          <div className="flex flex-wrap items-center gap-3">
            {CANDY_TONES.map((tone) => (
              <div key={tone.id} className="flex flex-col items-center gap-1">
                <CandySign tone={tone.id} className="size-10" />
                <span className="max-w-16 text-center text-base leading-tight text-violet-300">
                  {tone.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <div className="space-y-3">
          {CANDY_OPTIONS.map((option) => {
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
                    <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-base font-medium text-black">
                      בפופאפ עכשיו
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {CANDY_TONES.map((tone) => (
                    <div key={tone.id} className="flex flex-col items-center gap-1">
                      <CandySign Glyph={Glyph} tone={tone.id} className="size-10" />
                      <span className="max-w-16 text-center text-base leading-tight text-violet-300">
                        {tone.label}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <PreviewPhoto src="/preview/candy-icon-options.png" alt="חמש צורות ממתק בארבעה מצבי מלאי" />
      </div>
    </div>
  );
}
