"use client";

import { useEffect, useRef, useState } from "react";
import { Copy, Printer } from "lucide-react";
import { toast } from "sonner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/copy-text";
import { houseHeadline } from "@/lib/labels";
import { houseVisitQrUrl } from "@/lib/house-visit-qr";
import { printHouseVisitQrPoster } from "@/lib/house-visit-qr-print-client";
import type { PublicHouse } from "@/lib/types";

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
            disabled={!url}
            onClick={() => {
              if (!url) return;
              void printHouseVisitQrPoster({ houseName: title, visitUrl: url });
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
