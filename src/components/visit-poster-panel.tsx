"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { HelpCircle, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HelpText } from "@/components/help-text";
import { HouseEditModal } from "@/components/house-edit-modal";
import { useLocale } from "@/hooks/use-locale";
import { VISIT_POSTER_CSS, VisitPoster } from "@/components/visit-poster";
import type { PublicHouse } from "@/lib/types";

const PRINT_ROOT_ID = "visit-poster-print-root";

/**
 * Printing uses a dedicated copy of the poster portaled straight under <body>, laid out
 * off-screen at the printed size (194mm wide, stretched ~4% to fill A4). Its name fit is
 * therefore already correct for paper, and print CSS only has to hide body's other children —
 * no hidden-but-still-laid-out app UI to push extra pages or clip the sheet.
 */
export const VISIT_POSTER_PRINT_CSS = `
#${PRINT_ROOT_ID} {
  position: fixed;
  top: 0;
  left: -10000px;
  width: 194mm;
  visibility: hidden;
  pointer-events: none;
}
@page {
  size: A4 portrait;
  margin: 8mm;
}
@media print {
  html, body {
    width: auto !important;
    height: auto !important;
    min-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
    color-scheme: light !important;
  }
  body > *:not(#${PRINT_ROOT_ID}) {
    display: none !important;
  }
  #${PRINT_ROOT_ID} {
    position: static !important;
    left: auto !important;
    visibility: visible !important;
    margin: 0 auto !important;
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
`;

const noopSubscribe = () => () => {};

function VisitPosterPrintRoot({ house }: { house: PublicHouse }) {
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!mounted) return null;
  return createPortal(
    <div id={PRINT_ROOT_ID} aria-hidden>
      <VisitPoster house={house} aspectRatio="200 / 280" />
    </div>,
    document.body,
  );
}

function VisitPosterActions({ actions }: { actions?: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        className="bg-orange-500 text-lg text-black hover:bg-orange-400"
        onClick={() => window.print()}
      >
        <Printer className="size-5" />
        {t("visitPoster.print")}
      </Button>
      {actions}
    </div>
  );
}

export function VisitPosterPanel({ house, actions }: { house: PublicHouse; actions?: ReactNode }) {
  const { t } = useLocale();
  return (
    <div className="space-y-4">
      <style dangerouslySetInnerHTML={{ __html: VISIT_POSTER_CSS + VISIT_POSTER_PRINT_CSS }} />

      <div className="visit-poster-sheet overflow-hidden rounded-xl shadow-2xl ring-1 ring-orange-500/25">
        <VisitPoster house={house} />
      </div>

      <VisitPosterPrintRoot house={house} />

      <VisitPosterActions actions={actions} />

      <p className="text-start text-base leading-relaxed text-violet-100">
        <HelpText>{t("visitPoster.footer")}</HelpText>{" "}
        <Link href="/help/scan-visit" className="inline-flex items-center gap-1 text-orange-300 underline">
          <HelpCircle className="size-4" aria-hidden />
          {t("visitPoster.helpLink")}
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
  const { t } = useLocale();
  return (
    <HouseEditModal
      open={open}
      onClose={onClose}
      placement="top-safe"
      title={t("visitPoster.title")}
      closeBarClassName="hw-overlay-close-bar--minimal-top-safe"
      className="w-[min(100%-1rem,34rem)] max-w-[calc(100vw-1rem)]"
    >
      {open ? <VisitPosterPanel house={house} /> : null}
    </HouseEditModal>
  );
}
