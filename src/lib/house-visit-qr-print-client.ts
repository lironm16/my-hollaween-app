"use client";

import { toast } from "sonner";
import { HOUSE_VISIT_QR_PRINT_PX, houseVisitQrPrintDocumentHtml } from "@/lib/house-visit-qr-print";

export async function printHouseVisitQrPoster(options: { houseName: string; visitUrl: string }) {
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
    houseVisitQrPrintDocumentHtml({
      houseName: options.houseName,
      dataUrl,
    }),
  );
  win.document.close();
}
