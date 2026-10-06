import { PreviewNav } from "@/components/preview-nav";
import {
  pinSchoolClusterIconHtml,
  SCHOOL_PIN_VARIANT_LABELS,
  type SchoolPinVariant,
} from "@/lib/map-pin-school-icon";
import { config } from "@/lib/config";

const VARIANTS: SchoolPinVariant[] = ["castle-png", "castle-svg", "twin-homes", "emoji-campus"];

export default function SchoolPinsPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · סיכת בית ספר</p>
          <h1 className="text-2xl font-semibold text-orange-100">איזה אייקון לבית ספר?</h1>
          <p className="text-base text-violet-200">
            ברירת המחדל במפה: <strong className="text-orange-200">castle-png</strong> (הטירה
            המקורית). לשינוי בפרודקשן: משתנה סביבה{" "}
            <code className="text-orange-300">NEXT_PUBLIC_SCHOOL_PIN_VARIANT</code> — אחד מ־
            {VARIANTS.join(", ")}.
          </p>
          <PreviewNav current="/preview/school-pins" />
        </header>

        <section className="space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-base font-medium text-orange-100">עיגול סגול (כמו בניין / רוח)</h2>
          <div className="flex flex-wrap items-end justify-center gap-8 pt-2">
            {VARIANTS.map((variant) => {
              const meta = SCHOOL_PIN_VARIANT_LABELS[variant];
              return (
                <div key={variant} className="flex max-w-[9rem] flex-col items-center gap-2 text-center">
                  <div
                    className="house-pin is-building is-school-campus relative"
                    style={{ background: "#6d28d9" }}
                    aria-label={meta.title}
                    dangerouslySetInnerHTML={{ __html: pinSchoolClusterIconHtml(variant) }}
                  />
                  <span className="text-base font-medium text-orange-200">{meta.title}</span>
                  <span className="text-sm text-violet-300">{meta.note}</span>
                  <code className="text-xs text-violet-400">{variant}</code>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
