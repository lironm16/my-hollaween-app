"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { HelpCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HouseEditModal } from "@/components/house-edit-modal";
import { VISIT_POSTER_CSS, VisitPoster } from "@/components/visit-poster";
import type { PublicHouse } from "@/lib/types";

/**
 * Visibility-based print (Chrome + Safari). Avoids heavy `body * :has()` rules that
 * blocked Chrome's print dialog. Refit house name in px on beforeprint (visit-poster.tsx).
 */
export const VISIT_POSTER_PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 8mm;
}
@media print {
  html {
    color-scheme: light !important;
  }
  .no-print {
    display: none !important;
  }
  html, body {
    width: 100% !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
  }
  body * {
    visibility: hidden !important;
  }
  .visit-poster-sheet,
  .visit-poster-sheet * {
    visibility: visible !important;
  }
  .visit-poster-sheet {
    position: fixed !important;
    inset: 0 !important;
    margin: auto !important;
    width: 194mm !important;
    max-width: 194mm !important;
    max-height: 276mm !important;
    height: auto !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    --tw-ring-shadow: 0 0 #0000 !important;
    overflow: hidden !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
    page-break-after: avoid !important;
  }
  .visit-poster-sheet .visit-poster {
    width: 100% !important;
    height: auto !important;
    max-height: 276mm !important;
    aspect-ratio: 200 / 280 !important;
  }
  .visit-poster-qr img {
    object-fit: contain;
  }
}
`;

export function printVisitPoster() {
  window.dispatchEvent(new Event("hw-visit-poster-refit"));
  requestAnimationFrame(() => {
    requestAnimationFrame(() => window.print());
  });
}

function VisitPosterActions({ actions }: { actions?: ReactNode }) {
  return (
    <div className="no-print flex flex-wrap items-center gap-2">
      <Button
        type="button"
        className="bg-orange-500 text-lg text-black hover:bg-orange-400"
        onClick={() => printVisitPoster()}
      >
        <Printer className="size-5" />
        הדפסה
      </Button>
      {actions}
    </div>
  );
}

export function VisitPosterPanel({ house, actions }: { house: PublicHouse; actions?: ReactNode }) {
  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: VISIT_POSTER_CSS + VISIT_POSTER_PRINT_CSS }} />

      <div className="visit-poster-sheet overflow-hidden rounded-xl shadow-2xl ring-1 ring-orange-500/25">
        <VisitPoster house={house} />
      </div>

      <VisitPosterActions actions={actions} />

      <p className="no-print text-base leading-relaxed text-violet-100">
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
      placement="top-safe"
      title="דף ביקור"
      closeBarClassName="hw-overlay-close-bar--minimal-top-safe"
      className="w-[min(100%-1rem,34rem)] max-w-[calc(100vw-1rem)]"
    >
      {open ? <VisitPosterPanel house={house} /> : null}
    </HouseEditModal>
  );
}
