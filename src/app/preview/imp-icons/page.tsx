import type { ReactNode } from "react";

import {
  IMP_DEMON_PREVIEW_SPECS,
  ImpDemonReferenceFilledMenu,
  ImpDemonReferenceOutline,
  PREVIEW_ICON_SIZES,
} from "@/components/imp-demon-reference-icon";
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

export default function ImpIconsPreviewPage() {
  const reference = IMP_DEMON_PREVIEW_SPECS[0];
  const outlineMenu = IMP_DEMON_PREVIEW_SPECS[1];
  const filledMenu = IMP_DEMON_PREVIEW_SPECS[2];

  return (
    <div className="min-h-dvh bg-[#140a1c] px-4 py-6 text-orange-50" dir="rtl">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-base text-violet-300">{config.brandEn} · שדון</p>
          <h1 className="text-2xl font-semibold text-orange-100">גרסאות צבע וצורה — לפי המקור שלך</h1>
          <p className="text-base text-violet-200">
            רק האיור שהעלית + SVG שמחקה אותו בצבעי האפליקציה. בחרו{" "}
            <code className="text-orange-300">svg-outline-menu</code> /{" "}
            <code className="text-orange-300">svg-filled-menu</code> לפני פרודקשן.
          </p>
          <PreviewNav current="/preview/imp-icons" />
        </header>

        <section className="space-y-4 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/25">
          <h2 className="text-lg font-medium text-orange-100">ייחוס</h2>
          <div className="flex justify-center rounded-xl bg-[#faf8f5] p-4">{reference.render()}</div>
        </section>

        <section className="space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/20">
          <h2 className="text-lg font-medium text-orange-100">תפריט</h2>
          <MenuRow
            label="מצא שדון"
            icon={<ImpDemonReferenceOutline className="size-4 text-orange-100" />}
          />
          <MenuRow
            label="מצאתי"
            icon={<ImpDemonReferenceFilledMenu className="size-4" />}
            active
          />
          <MenuRow label="דילוג" icon={<SkipOutlineIcon className="size-4 text-orange-100" />} />
        </section>

        {IMP_DEMON_PREVIEW_SPECS.slice(1).map((spec) => (
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
                  <div
                    className={cn(
                      "flex h-14 items-center justify-center rounded-xl px-5",
                      spec.id.includes("light") ? "bg-[#faf8f5]" : "bg-[#3d262a]",
                    )}
                  >
                    {spec.render(size.className)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-2xl bg-[#1d1028]/60 p-4 text-sm text-violet-400 ring-1 ring-violet-500/20">
          <p>
            השוואה: {outlineMenu.title} ↔ {filledMenu.title} — אותה גיאומטריה, outline מול fill.
          </p>
        </section>
      </div>
    </div>
  );
}
