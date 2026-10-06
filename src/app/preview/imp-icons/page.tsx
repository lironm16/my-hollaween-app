import type { ReactNode } from "react";

import {
  CREATURE_ICON_LAB,
  ImpDevilFaceFilled,
  ImpDevilFaceOutline,
  PREVIEW_ICON_SIZES,
} from "@/components/imp-creature-icon-lab";
import { PreviewNav } from "@/components/preview-nav";
import { SkipOutlineIcon } from "@/components/skip-icon";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

function MenuRow({
  label,
  icon,
  active,
}: {
  label: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-orange-50",
        active ? "bg-[#3d262a]" : "bg-[#2a1838]/80 ring-1 ring-orange-500/15",
      )}
    >
      <span className="text-base">{label}</span>
      <span className="inline-flex shrink-0 items-center justify-center">{icon}</span>
    </div>
  );
}

function IconPair({
  Outline,
  Filled,
  sizeClass,
}: {
  Outline: React.ComponentType<{ className?: string }>;
  Filled: React.ComponentType<{ className?: string }>;
  sizeClass: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-violet-500">outline</span>
        <Outline className={cn(sizeClass, "text-orange-100")} />
      </div>
      <div className="flex flex-col items-center gap-1">
        <span className="text-[10px] uppercase tracking-wide text-violet-500">fill</span>
        <Filled className={cn(sizeClass, "text-amber-300")} />
      </div>
    </div>
  );
}

export default function ImpIconsPreviewPage() {
  const impPicks = CREATURE_ICON_LAB.filter((e) => e.impCandidate);
  const roster = CREATURE_ICON_LAB.filter((e) => !e.impCandidate);

  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-4xl space-y-10">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · מעבדת אייקונים</p>
          <h1 className="text-2xl font-semibold text-orange-100">יצורים ליל כל הקדושים — רעיונות SVG</h1>
          <p className="max-w-2xl text-base leading-relaxed text-violet-200">
            עמוד מלא של צורות חדשות: לכל יצור <strong className="font-medium text-orange-200">outline</strong>{" "}
            (כמו דילוג בתפריט) ו־<strong className="font-medium text-orange-200">fill</strong> (ל«מצאתי» / צהוב).
            בחרו <code className="text-orange-300">id</code> לשדון ולשאר החיות — הפרודקשן עדיין לא השתנה.
          </p>
          <PreviewNav current="/preview/imp-icons" />
        </header>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/30">
          <h2 className="text-lg font-medium text-orange-100">מומלץ לתפריט «מצא שדון»</h2>
          <p className="text-sm text-violet-300">השוואה לדילוג — אותו size-4.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <MenuRow
              label="מצא שדון"
              icon={<ImpDevilFaceOutline className="size-4 text-orange-100" />}
            />
            <MenuRow
              label="מצאתי"
              icon={<ImpDevilFaceFilled className="size-4 text-amber-300" />}
              active
            />
            <MenuRow label="דילוג" icon={<SkipOutlineIcon className="size-4 text-orange-100" />} />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium text-orange-100">שלושה כיוונים לשדון</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {impPicks.map((entry) => (
              <article
                key={entry.id}
                className="flex flex-col gap-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-amber-500/25"
              >
                <div>
                  <p className="text-sm text-amber-400/90">{entry.creatureHe} · {entry.styleHe}</p>
                  <h3 className="text-lg text-orange-50">{entry.note}</h3>
                  <code className="text-xs text-violet-400">{entry.id}</code>
                </div>
                <div className="flex justify-center rounded-xl bg-[#3d262a] py-4">
                  <IconPair Outline={entry.Outline} Filled={entry.Filled} sizeClass="size-10" />
                </div>
                <MenuRow
                  label="מצא שדון"
                  icon={<entry.Outline className="size-4 text-orange-100" />}
                  active
                />
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-medium text-orange-100">שאר חיות האוסף (gem / UI)</h2>
          <p className="text-base text-violet-300">
            אותה שפה גрафית — אפשר ליישם לתגיות, רשימת שק, או אייקוני משנה.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {roster.map((entry) => (
              <article
                key={entry.id}
                className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/15"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-medium text-orange-100">
                      {entry.creatureHe}
                      <span className="ms-2 text-base font-normal text-violet-400">{entry.styleHe}</span>
                    </h3>
                    <p className="text-sm text-violet-300">{entry.note}</p>
                  </div>
                  <code className="text-xs text-violet-500">{entry.id}</code>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-[#3d262a] px-4 py-3">
                  <IconPair Outline={entry.Outline} Filled={entry.Filled} sizeClass="size-8" />
                  <div className="flex flex-col gap-2">
                    {PREVIEW_ICON_SIZES.map((s) => (
                      <div key={s.label} className="flex items-center gap-2">
                        <span className="w-14 text-xs text-violet-500">{s.label}</span>
                        <entry.Outline className={cn(s.className, "text-orange-100")} />
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
