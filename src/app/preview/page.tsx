import { CANDY_TONES, CandySign } from "@/components/candy-glyphs";
import { DECOR_TONES, DecorSign } from "@/components/decor-glyphs";
import { PreviewNav } from "@/components/preview-nav";
import { SCARE_TONES, ScareSign } from "@/components/scare-glyphs";
import { SENSITIVITY_KINDS, SensitivitySign } from "@/components/sensitivity-glyphs";
import { config } from "@/lib/config";

export default function PreviewHubPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-xs text-violet-300">{config.appName} · בחירת אייקון</p>
          <h1 className="text-2xl font-semibold text-orange-100">האייקונים החיים</h1>
          <p className="text-sm text-violet-200">
            כאן רואים רגישויות, ממתקים, פחד וקישוט בלי לחכות לתמונות גדולות. ירוק ברוח = לילדים.
            אפור עם קו בקישוט = לא מקושט.
          </p>
          <PreviewNav current="/preview" />
        </header>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">רגישויות</h2>
          <p className="text-xs text-violet-300">קו דק מקצה לקצה, כמו בתמונה המקורית.</p>
          <div className="flex flex-wrap items-end gap-4">
            {SENSITIVITY_KINDS.map((kind) => (
              <div key={kind.id} className="flex flex-col items-center gap-1">
                <SensitivitySign kind={kind.id} className="size-12" />
                <span className="max-w-20 text-center text-[11px] leading-tight text-violet-300">
                  {kind.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">ממתקים</h2>
          <p className="text-xs text-violet-300">אפור עם קו = הבית בלי ממתקים מההתחלה.</p>
          <div className="flex flex-wrap items-end gap-4">
            {CANDY_TONES.map((tone) => (
              <div key={tone.id} className="flex flex-col items-center gap-1">
                <CandySign tone={tone.id} className="size-12" />
                <span className="max-w-20 text-center text-[11px] leading-tight text-violet-300">
                  {tone.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">פחד</h2>
          <p className="text-xs text-violet-300">ירוק = לילדים. אין מצב אפור — זה לקישוט.</p>
          <div className="flex flex-wrap items-end gap-4">
            {SCARE_TONES.map((tone) => (
              <div key={tone.id} className="flex flex-col items-center gap-1">
                <ScareSign level={tone.id} className="size-12" />
                <span className="text-[11px] text-violet-300">{tone.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">קישוט</h2>
          <p className="text-xs text-violet-300">אפור עם קו = לא מקושט.</p>
          <div className="flex flex-wrap items-end gap-4">
            {DECOR_TONES.map((tone) => (
              <div key={tone.id} className="flex flex-col items-center gap-1">
                <DecorSign level={tone.id} className="size-12" />
                <span className="text-[11px] text-violet-300">{tone.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
