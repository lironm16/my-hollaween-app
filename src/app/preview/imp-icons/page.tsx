import type { ReactNode } from "react";

import { SkipOutlineIcon } from "@/components/skip-icon";
import { PreviewNav } from "@/components/preview-nav";
import {
  IMP_ICON_PREVIEW_SPECS,
  PREVIEW_ICON_SIZES,
} from "@/components/imp-icon-variants";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

function MenuRowMock({
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
      <span className="inline-flex shrink-0 items-center justify-center text-orange-100">{icon}</span>
    </div>
  );
}

export default function ImpIconsPreviewPage() {
  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · אייקון שדון</p>
          <h1 className="text-2xl font-semibold text-orange-100">דוגמאות שדון — מלא / קווי / PNG</h1>
          <p className="text-base text-violet-200">
            התפריט והכותרת עדיין משתמשים ב־<code className="text-orange-300">imp-outline-icon</code>{" "}
            (v1). בחרו כאן גרסה לפני שמחליפים בפרודקשן. השוואה לדילוג (outline) באותו גודל.
          </p>
          <PreviewNav current="/preview/imp-icons" />
        </header>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-lg font-medium text-orange-100">הקשר תפריט</h2>
          <div className="space-y-2">
            <MenuRowMock
              label="מצא שדון"
              icon={IMP_ICON_PREVIEW_SPECS.find((s) => s.id === "svg-outline-current")!.render("size-4")}
            />
            <MenuRowMock
              label="דילוג"
              icon={<SkipOutlineIcon className="size-4 shrink-0" />}
            />
          </div>
        </section>

        {IMP_ICON_PREVIEW_SPECS.map((spec) => (
          <section
            key={spec.id}
            className="space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20"
          >
            <div>
              <h2 className="text-lg font-medium text-orange-100">{spec.title}</h2>
              <p className="text-base text-violet-300">{spec.note}</p>
              <code className="mt-1 inline-block text-sm text-violet-400">{spec.id}</code>
            </div>

            <div className="flex flex-wrap items-end gap-8">
              {PREVIEW_ICON_SIZES.map((size) => (
                <div key={size.label} className="flex flex-col items-center gap-2">
                  <p className="text-sm text-violet-400">{size.label}</p>
                  <div className="flex h-12 items-center justify-center rounded-xl bg-[#3d262a] px-4">
                    {spec.render(size.className)}
                  </div>
                </div>
              ))}
            </div>

            <MenuRowMock label="מצא שדון" icon={spec.render("size-4")} active />
          </section>
        ))}
      </div>
    </div>
  );
}
