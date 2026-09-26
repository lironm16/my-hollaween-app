"use client";

import Image from "next/image";
import { gemAlbumStickerPool, gemLabelHe } from "@/lib/gem-monsters";

/** Admin-only — compare mystery / map marker styles for album friends. */
export function GemCharacterSilhouetteSamples() {
  const sample = gemAlbumStickerPool()[0];
  if (!sample) return null;
  const src = sample.posterPath;
  const label = gemLabelHe(sample.id);

  const variants: { id: string; title: string; hint: string; className: string }[] = [
    {
      id: "full",
      title: "פוסטר מלא",
      hint: "כמו באלבום אחרי איסוף",
      className: "gem-silhouette-sample__art gem-silhouette-sample__art--full",
    },
    {
      id: "silhouette",
      title: "צללית שחורה",
      hint: "דמות בלי פרטים — רק צורה",
      className: "gem-silhouette-sample__art gem-silhouette-sample__art--silhouette",
    },
    {
      id: "glow",
      title: "צל + הילה",
      hint: "סגול כמו «מסתתר במפה»",
      className: "gem-silhouette-sample__art gem-silhouette-sample__art--glow",
    },
    {
      id: "outline",
      title: "קו מתאר",
      hint: "דמות ריקה עם מסגרת",
      className: "gem-silhouette-sample__art gem-silhouette-sample__art--outline",
    },
  ];

  return (
    <div className="space-y-2 rounded-xl bg-[#12081a] p-3 ring-1 ring-orange-500/20">
      <p className="text-base font-medium text-orange-100">דוגמאות לצללית חבר (לבדיקה)</p>
      <p className="text-base text-violet-300">
        אותה דמות ({label}) — ארבעה סגנונות אפשריים לסימון במפה / אלבום לפני גילוי.
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {variants.map((variant) => (
          <figure key={variant.id} className="gem-silhouette-sample">
            <div className="gem-silhouette-sample__frame">
              <Image src={src} alt="" width={96} height={96} className={variant.className} />
            </div>
            <figcaption className="gem-silhouette-sample__cap">
              <span className="font-medium text-orange-100">{variant.title}</span>
              <span className="text-violet-300">{variant.hint}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
