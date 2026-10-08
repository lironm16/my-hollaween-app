"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/copy-text";
import { houseHeadline } from "@/lib/labels";
import { houseVisitQrUrl } from "@/lib/house-visit-qr";
import type { PublicHouse } from "@/lib/types";

function printVisitQrSheet(options: { title: string; url: string; dataUrl: string }) {
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) {
    toast.error("לא הצלחנו לפתוח חלון הדפסה");
    return;
  }
  const escapedTitle = options.title.replace(/</g, "&lt;");
  const escapedUrl = options.url.replace(/</g, "&lt;");
  win.document.write(`<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="utf-8" />
  <title>QR ביקור — ${escapedTitle}</title>
  <style>
    body { font-family: system-ui, sans-serif; text-align: center; padding: 24px; margin: 0; }
    h1 { font-size: 1.35rem; margin: 0 0 8px; }
    p { font-size: 1rem; line-height: 1.5; max-width: 320px; margin: 0 auto 16px; color: #333; }
    img { width: 240px; height: 240px; }
    .url { font-size: 0.75rem; word-break: break-all; color: #666; margin-top: 12px; direction: ltr; }
  </style>
</head>
<body>
  <h1>${escapedTitle}</h1>
  <p>סרקו עם המצלמה או מהאפליקציה — תסומנו «ביקרתי» ותראו את הבית במפה.</p>
  <img src="${options.dataUrl}" alt="QR" width="240" height="240" />
  <p class="url">${escapedUrl}</p>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`);
  win.document.close();
}

export function HouseVisitQrDialog({
  open,
  house,
  onClose,
}: {
  open: boolean;
  house: PublicHouse;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!open) return;
    const visitUrl = houseVisitQrUrl(house);
    setUrl(visitUrl);
    let cancelled = false;
    void import("qrcode").then((QRCode) => {
      if (cancelled || !canvasRef.current) return;
      void QRCode.toCanvas(canvasRef.current, visitUrl, {
        width: 240,
        margin: 2,
        color: { dark: "#1a0a2e", light: "#ffffff" },
      }).then(() => {
        if (!cancelled && canvasRef.current) {
          setDataUrl(canvasRef.current.toDataURL("image/png"));
        }
      });
    });
    return () => {
      cancelled = true;
      setDataUrl(null);
    };
  }, [open, house]);

  const title = houseHeadline(house);

  return (
    <HouseEditModal open={open} onClose={onClose} title="QR לביקור" subtitle={title}>
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-violet-100">
          הדפיסו והציגו ליד הדלת. אורחים סורקים את הקוד — נפתחת המפה, הבית מסומן «ביקרתי» (גם בדפדפן וגם
          באפליקציה מותקנת).
        </p>
        <div className="flex justify-center rounded-2xl bg-white p-4">
          <canvas ref={canvasRef} aria-label="קוד QR לביקור" role="img" />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full text-lg"
          onClick={() => void copyText(url, "קישור הביקור הועתק")}
        >
          <Copy className="size-5" />
          העתיקו קישור
        </Button>
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            className="min-w-0 flex-1 bg-orange-500 text-lg text-black hover:bg-orange-400"
            disabled={!dataUrl}
            onClick={() => {
              if (!dataUrl) return;
              printVisitQrSheet({ title, url, dataUrl });
            }}
          >
            <Printer className="size-5" />
            הדפסה
          </Button>
          <Button type="button" variant="outline" className="min-w-0 flex-1 text-lg" onClick={onClose}>
            סגירה
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
