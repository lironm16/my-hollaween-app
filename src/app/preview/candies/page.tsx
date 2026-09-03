import Link from "next/link";
import { CANDY_OPTIONS, CANDY_TONES, CandySign } from "@/components/candy-glyphs";
import { config } from "@/lib/config";

export default function CandyPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-2">
          <p className="text-xs text-violet-300">{config.appName} · בחירת אייקון</p>
          <h1 className="text-2xl font-semibold text-orange-100">איזה ממתק יותר ברור?</h1>
          <p className="text-sm text-violet-200">
            ירוק = יש, כתום = מעט, אדום = נגמר, אפור עם קו = הבית בלי ממתקים מההתחלה. כתבו מספר צורה.
          </p>
          <div className="flex gap-3 text-sm">
            <Link href="/" className="text-orange-300 underline-offset-2 hover:underline">
              חזרה למפה
            </Link>
            <Link href="/preview/strollers" className="text-orange-300 underline-offset-2 hover:underline">
              עגלות
            </Link>
          </div>
        </header>

        <figure className="overflow-hidden rounded-2xl ring-1 ring-orange-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/preview/candy-icon-options.png"
            alt="חמש צורות ממתק בארבעה מצבי מלאי"
            className="h-auto w-full"
          />
        </figure>

        <div className="space-y-3">
          {CANDY_OPTIONS.map((option) => {
            const Glyph = option.Glyph;
            return (
              <section
                key={option.id}
                id={option.id}
                className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
              >
                <h2 className="text-base font-medium text-orange-100">
                  {option.number}. {option.name}
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                  {CANDY_TONES.map((tone) => (
                    <div key={tone.id} className="flex flex-col items-center gap-1">
                      <CandySign Glyph={Glyph} tone={tone.id} />
                      <span className="max-w-16 text-center text-[10px] leading-tight text-violet-300">
                        {tone.label}
                      </span>
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
