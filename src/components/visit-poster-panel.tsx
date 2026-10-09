"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Copy, HelpCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HouseEditModal } from "@/components/house-edit-modal";
import { VISIT_POSTER_CSS, VisitPoster } from "@/components/visit-poster";
import { copyText } from "@/lib/copy-text";
import { houseVisitQrUrl } from "@/lib/house-visit-qr";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

/**
 * Prints only the poster, wherever it is mounted (route page or popup over the map).
 * Ancestors of the sheet are flattened so no wrapper caps its width or clips it;
 * everything else is removed from layout so nothing pushes it to a second page.
 * The poster is stretched ~4% taller than the template to fill A4 height.
 */
export const VISIT_POSTER_PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 6mm;
}
@media print {
  html {
    color-scheme: light !important;
  }
  html, body,
  *:has(.visit-poster-sheet) {
    display: block !important;
    position: static !important;
    inset: auto !important;
    transform: none !important;
    translate: none !important;
    scale: none !important;
    rotate: none !important;
    width: auto !important;
    max-width: none !important;
    height: auto !important;
    min-height: 0 !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
    box-shadow: none !important;
    border: 0 !important;
    outline: 0 !important;
    animation: none !important;
  }
  body *:not(:has(.visit-poster-sheet)):not(.visit-poster-sheet):not(.visit-poster-sheet *) {
    display: none !important;
  }
  .visit-poster-sheet {
    width: 100% !important;
    max-width: none !important;
    margin: 0 auto !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    --tw-ring-shadow: 0 0 #0000 !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .visit-poster-sheet .visit-poster {
    width: 100% !important;
    height: auto !important;
    aspect-ratio: 200 / 280 !important;
  }
  .visit-poster-qr img {
    object-fit: contain;
  }
}
`;

export function VisitPosterPanel({ house, actions }: { house: PublicHouse; actions?: ReactNode }) {
  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: VISIT_POSTER_CSS + VISIT_POSTER_PRINT_CSS }} />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          className="bg-orange-500 text-lg text-black hover:bg-orange-400"
          onClick={() => window.print()}
        >
          <Printer className="size-5" />
          הדפסה
        </Button>
        <Button
          type="button"
          variant="outline"
          className="text-lg"
          onClick={() => void copyText(houseVisitQrUrl(house), "קישור הביקור הועתק")}
        >
          <Copy className="size-5" />
          העתקת קישור
        </Button>
        {actions}
      </div>

      <div className="visit-poster-sheet overflow-hidden rounded-xl shadow-2xl ring-1 ring-orange-500/25">
        <VisitPoster house={house} />
      </div>

      <p className="text-base leading-relaxed text-violet-100">
        תלו את הדף ליד הדלת. אורחים סורקים את הקוד במצלמת הטלפון ולוחצים על הקישור — האפליקציה
        נפתחת על הבית והוא מסומן «ביקרתי».{" "}
        <Link href="/help/scan-visit" className="inline-flex items-center gap-1 text-orange-300 underline">
          <HelpCircle className="size-4" aria-hidden />
          איך סורקים ומדפיסים?
        </Link>
      </p>
    </div>
  );
}

export function VisitPosterDialog({
  open,
  house,
  onClose,
}: {
  open: boolean;
  house: PublicHouse;
  onClose: () => void;
}) {
  return (
    <HouseEditModal
      open={open}
      onClose={onClose}
      title="דף ביקור"
      subtitle={houseHeadline(house)}
      className="max-h-[94dvh] w-[min(100%-1rem,34rem)] max-w-[calc(100vw-1rem)]"
    >
      {open ? <VisitPosterPanel house={house} /> : null}
    </HouseEditModal>
  );
}
