"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Copy, HelpCircle, Printer } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { VISIT_POSTER_CSS, VisitPoster } from "@/components/visit-poster";
import { useCatalog } from "@/hooks/use-catalog";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { copyText } from "@/lib/copy-text";
import { houseVisitQrUrl } from "@/lib/house-visit-qr";
import { houseSharePath } from "@/lib/nav-links";
import { resolveHouseIdFromPath } from "@/lib/ids";
import { cn } from "@/lib/utils";

const PRINT_CSS = `
@page {
  size: A4 portrait;
  margin: 10mm 12mm;
}
@media print {
  html, body {
    width: 100% !important;
    height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    background: #fff !important;
  }
  body * {
    visibility: hidden !important;
  }
  .visit-poster-sheet, .visit-poster-sheet * {
    visibility: visible !important;
  }
  .visit-poster-sheet {
    position: relative !important;
    width: 100% !important;
    max-width: 186mm !important;
    max-height: 250mm !important;
    margin: 0 auto !important;
    box-shadow: none !important;
    border-radius: 0 !important;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
  .visit-poster-sheet .visit-poster {
    width: 100% !important;
    max-height: 250mm !important;
    height: auto !important;
    margin: 0 auto !important;
  }
}
`;

export default function VisitPosterPage() {
  const params = useParams<{ id: string }>();
  const id = resolveHouseIdFromPath(params.id);
  const { catalog, loading } = useCatalog();
  const owned = useOwnedHouses();
  const house = catalog?.houses.find((h) => h.id === id) ?? owned.find((item) => item.id === id)?.preview;

  return (
    <div className="relative flex h-dvh min-h-dvh flex-col overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: VISIT_POSTER_CSS + PRINT_CSS }} />
      <AppHeader />
      <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-10">
        <div className="mx-auto w-full max-w-xl space-y-4">
          {house ? (
            <>
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
                <Link
                  href={houseSharePath(house)}
                  className={cn(buttonVariants({ variant: "outline" }), "text-lg")}
                >
                  חזרה לבית
                </Link>
              </div>
              <p className="text-base leading-relaxed text-violet-100">
                תלו את הדף ליד הדלת. אורחים סורקים את הקוד במצלמת הטלפון ולוחצים על הקישור — האפליקציה
                נפתחת על הבית והוא מסומן «ביקרתי».{" "}
                <Link href="/help/scan-visit" className="inline-flex items-center gap-1 text-orange-300 underline">
                  <HelpCircle className="size-4" aria-hidden />
                  איך סורקים ומדפיסים?
                </Link>
              </p>
              <div className="visit-poster-sheet overflow-hidden rounded-xl shadow-2xl ring-1 ring-orange-500/25">
                <VisitPoster house={house} />
              </div>
            </>
          ) : (
            <p className="text-orange-200">{loading ? "טוענים…" : "הבית לא נמצא."}</p>
          )}
        </div>
      </main>
    </div>
  );
}
