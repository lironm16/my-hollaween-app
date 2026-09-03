import Link from "next/link";
import { SCARE_OPTIONS, SCARE_TONES, ScareSign } from "@/components/scare-glyphs";
import { config } from "@/lib/config";

export default function ScarePreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-2">
          <p className="text-xs text-violet-300">{config.appName} · בחירת אייקון</p>
          <h1 className="text-2xl font-semibold text-orange-100">איזה פחד יותר ברור?</h1>
          <p className="text-sm text-violet-200">
            ירוק = עדין, כתום = בינוני, אדום = מפחיד, אפור עם קו = לא מקושט. כתבו מספר צורה.
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
            <Link href="/preview/decor" className="text-orange-300 underline-offset-2 hover:underline">
              קישוט
            </Link>
            <Link href="/preview/sensitivities" className="text-orange-300 underline-offset-2 hover:underline">
              רגישויות
            </Link>
          </div>
        </header>

        <figure className="overflow-hidden rounded-2xl ring-1 ring-orange-500/20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/preview/scare-icon-options.png"
            alt="חמש צורות פחד בשלוש רמות"
            className="h-auto w-full"
          />
        </figure>

        <div className="space-y-3">
          {SCARE_OPTIONS.map((option) => {
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
                  {SCARE_TONES.map((tone) => (
                    <div key={tone.id} className="flex flex-col items-center gap-1">
                      <ScareSign Glyph={Glyph} level={tone.id} className="size-10" />
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
