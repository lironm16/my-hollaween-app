import { DECOR_OPTIONS, DECOR_TONES, DecorSign } from "@/components/decor-glyphs";
import { PreviewNav, PreviewPhoto } from "@/components/preview-nav";
import { config } from "@/lib/config";

export default function DecorPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-xs text-violet-300">{config.appName} · בחירת אייקון</p>
          <h1 className="text-2xl font-semibold text-orange-100">איזה קישוט יותר ברור?</h1>
          <p className="text-sm text-violet-200">
            ירוק = קריצה, כתום = חגיגה, אדום = פיצוץ, אפור עם קו = לא מקושט. בטופס ובדלפק: מספר 1,
            שלוש מנורות — לא רוח הרפאים של רמת הפחד.
          </p>
          <PreviewNav current="/preview/decor" />
        </header>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">סיכות במפה — קישוט בספרינקלס</h2>
          <p className="text-sm text-violet-200">
            בית מקושט מקבל ניצוצות זהובים. נקודת הצבע היא רק ממתקים: ירוק = יש, כתום = מעט, ובלי
            ממתקים אין נקודה. בניין עם כמה דירות נשאר סיכה אחת עם אותן נקודות, ואחרי הקשה הדירות
            עולות מעליה.
          </p>
          <div className="flex flex-wrap items-end gap-8 pt-2">
            <div className="flex flex-col items-center gap-2">
              <div className="house-pin relative" style={{ background: "#6d28d9" }} aria-label="מקושט">
                <i className="pin-sprinkles" aria-hidden>
                  <i />
                  <i />
                  <i />
                  <i />
                </i>
                <span>👻</span>
                <b className="pin-status is-plenty" />
              </div>
              <span className="text-[11px] text-violet-300">מקושט</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="house-pin relative" style={{ background: "#6d28d9" }}>
                <span>🎃</span>
                <b className="pin-status is-plenty" />
              </div>
              <span className="text-[11px] text-violet-300">בלי קישוט</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="house-pin is-building relative"
                style={{ background: "#6d28d9" }}
                aria-label="3 דירות"
              >
                <span>🎃</span>
                <span className="pin-apt-dots">
                  <i className="pin-apt-dot is-plenty" />
                  <i className="pin-apt-dot is-low" />
                </span>
              </div>
              <span className="text-[11px] text-violet-300">לפני הקשה</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div
                className="house-pin-fan relative"
                style={{ width: 156, height: 135 }}
                aria-label="אחרי הקשה"
              >
                <svg className="pin-fan-lines" aria-hidden viewBox="0 0 156 135" width={156} height={135}>
                  <line x1="78" y1="116" x2="41" y2="76" />
                  <line x1="78" y1="116" x2="78" y2="65" />
                  <line x1="78" y1="116" x2="115" y2="76" />
                </svg>
                <div className="house-pin is-base is-building" style={{ background: "#6d28d9" }} aria-hidden>
                  <span>🎃</span>
                  <span className="pin-apt-dots">
                    <i className="pin-apt-dot is-plenty" />
                    <i className="pin-apt-dot is-low" />
                  </span>
                </div>
                <div
                  className="house-pin is-apt"
                  style={{ left: 22, bottom: 40, background: "#6d28d9" }}
                  aria-label="מקושט"
                >
                  <i className="pin-sprinkles" aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </i>
                  <span>🎃</span>
                  <b className="pin-status is-plenty" />
                </div>
                <div
                  className="house-pin is-apt is-closing-soon"
                  style={{ left: 59, bottom: 51, background: "#6d28d9" }}
                  aria-label="נסגר בקרוב"
                >
                  <i className="pin-hours-ring is-closing" aria-hidden />
                  <span>🍬</span>
                  <b className="pin-status is-low" />
                </div>
                <div
                  className="house-pin is-apt"
                  style={{ left: 96, bottom: 40, background: "#6d28d9" }}
                  aria-label="מקושט בלי ממתקים"
                >
                  <i className="pin-sprinkles" aria-hidden>
                    <i />
                    <i />
                    <i />
                    <i />
                  </i>
                  <span>💀</span>
                </div>
              </div>
              <span className="text-[11px] text-violet-300">אחרי הקשה</span>
            </div>
          </div>
        </section>

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
                      בטופס עכשיו
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  {DECOR_TONES.map((tone) => (
                    <div key={tone.id} className="flex flex-col items-center gap-1">
                      <DecorSign Glyph={Glyph} level={tone.id} className="size-10" />
                      <span className="text-[10px] text-violet-300">{tone.label}</span>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <PreviewPhoto src="/preview/decor-icon-options.png" alt="חמש צורות קישוט במצב מקושט ולא מקושט" />
      </div>
    </div>
  );
}
