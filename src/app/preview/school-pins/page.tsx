import { PreviewNav } from "@/components/preview-nav";
import {
  pinSchoolClusterIconHtml,
  SCHOOL_PIN_VARIANT_PREVIEWS,
} from "@/lib/map-pin-school-icon";
import { config } from "@/lib/config";

export default function SchoolPinsPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · סיכת בית ספר</p>
          <h1 className="text-2xl font-semibold text-orange-100">דוגמאות אייקון בית ספר</h1>
          <p className="text-base text-violet-200">
            שלוש הגרסאות הראשונות נוצרו מהטירה שהעלית (
            <code className="text-orange-300">pin-school-campus.png</code>
            ). ברירת המחדל במפה: <strong className="text-orange-200">castle-ink</strong>.
            שינוי: <code className="text-orange-300">NEXT_PUBLIC_SCHOOL_PIN_VARIANT</code>.
          </p>
          <PreviewNav current="/preview/school-pins" />
        </header>

        {SCHOOL_PIN_VARIANT_PREVIEWS.map((item) => (
          <section
            key={item.variant}
            className="space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
          >
            <div>
              <h2 className="text-lg font-medium text-orange-100">{item.title}</h2>
              <p className="text-base text-violet-300">{item.note}</p>
              <code className="mt-1 inline-block text-sm text-violet-400">{item.variant}</code>
            </div>

            <div className="flex flex-wrap items-start justify-center gap-10">
              {item.assetSrc ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-sm text-violet-400">קובץ PNG</p>
                  <div className="rounded-xl bg-[#2a1838] p-4 ring-1 ring-violet-500/30">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.assetSrc}
                      srcSet={`${item.assetSrc} 1x, ${item.assetSrc2x} 2x`}
                      alt=""
                      className="h-auto w-[min(100%,13rem)] object-contain"
                      width={104}
                      height={128}
                    />
                  </div>
                  <a
                    href={item.assetSrc}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-orange-300 underline"
                  >
                    פתיחה בגודל מלא
                  </a>
                </div>
              ) : null}

              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-violet-400">על סיכה סגולה</p>
                <div
                  className="house-pin is-building is-school-campus relative"
                  style={{ background: "#6d28d9" }}
                  aria-hidden
                  dangerouslySetInnerHTML={{
                    __html: pinSchoolClusterIconHtml(item.variant),
                  }}
                />
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
