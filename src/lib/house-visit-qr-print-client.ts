"use client";

import { toast } from "sonner";
import {
  HOUSE_VISIT_QR_PRINT_PX,
  houseVisitQrPrintDocumentForHouse,
} from "@/lib/house-visit-qr-print";
import type { PublicHouse } from "@/lib/types";

export async function printHouseVisitQrPoster(options: { house: PublicHouse; visitUrl: string }) {
  const QRCode = await import("qrcode");
  const dataUrl = await QRCode.toDataURL(options.visitUrl, {
    width: HOUSE_VISIT_QR_PRINT_PX,
    margin: 2,
    color: { dark: "#1a0a2e", light: "#ffffff" },
  });

  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    toast.error("לא הצלחנו לפתוח חלון הדפסה");
    return;
  }
  win.document.write(
    houseVisitQrPrintDocumentForHouse({
      house: options.house,
      dataUrl,
    }),
  );
  win.document.close();
}
