import {
  SENSITIVITY_KINDS,
  SENSITIVITY_SETS,
  SensitivitySign,
} from "@/components/sensitivity-glyphs";
import { PreviewNav, PreviewPhoto } from "@/components/preview-nav";
import { config } from "@/lib/config";

export default function SensitivitiesPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-lg space-y-6">
        <header className="space-y-3">
          <p className="text-xs text-violet-300">{config.appName} · בחירת אייקון</p>
          <h1 className="text-2xl font-semibold text-orange-100">איזה סימון רגישויות יותר ברור?</h1>
          <p className="text-sm text-violet-200">
            ללא גלוטן · ללא אגוזים · ללא שומשום. הקו דק, מקצה לקצה — כמו בתמונה המקורית, רק דק יותר.
          </p>
          <PreviewNav current="/preview/sensitivities" />
        </header>

        <div className="space-y-3">
          {SENSITIVITY_SETS.map((set) => (
            <section
              key={set.id}
              id={set.id}
              className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-medium text-orange-100">
                    {set.number}. {set.name}
                  </h2>
                  <p className="text-xs text-violet-300">{set.blurb}</p>
                </div>
                {"current" in set && set.current ? (
                  <span className="shrink-0 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-medium text-black">
                    בפופאפ עכשיו
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {SENSITIVITY_KINDS.map((kind) => {
                  const Glyph =
                    kind.id === "glutenFree"
                      ? set.gluten
                      : kind.id === "nutsFree"
                        ? set.nuts
                        : set.sesame;
                  return (
                    <div key={kind.id} className="flex flex-col items-center gap-1">
                      {"current" in set && set.current ? (
                        <SensitivitySign kind={kind.id} className="size-10" />
                      ) : (
                        <SensitivitySign
                          Glyph={Glyph}
                          kind={kind.id}
                          out={"slash" in set && set.slash}
                          className="size-10"
                        />
                      )}
                      <span className="max-w-16 text-center text-[10px] leading-tight text-violet-300">
                        {kind.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <PreviewPhoto
          src="/preview/sensitivity-icon-options.png"
          alt="חמש סטים של אייקוני רגישות: גלוטן, אגוזים ושומשום"
        />
      </div>
    </div>
  );
}
