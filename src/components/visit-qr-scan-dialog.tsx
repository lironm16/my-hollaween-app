"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import { HouseEditModal } from "@/components/house-edit-modal";
import { houseVisitPathFromQrPayload } from "@/lib/parse-house-visit-qr";
import { toast } from "sonner";

type ScanPhase = "idle" | "starting" | "scanning" | "denied" | "unsupported";

type QrBarcodeDetector = {
  detect(source: ImageBitmapSource): Promise<{ rawValue?: string }[]>;
};

function qrBarcodeDetector(): (new (options: { formats: string[] }) => QrBarcodeDetector) | null {
  if (typeof globalThis === "undefined") return null;
  const scope = globalThis as typeof globalThis & {
    BarcodeDetector?: new (options: { formats: string[] }) => QrBarcodeDetector;
  };
  return scope.BarcodeDetector ?? null;
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

async function detectQrFromVideo(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  barcodeDetector: QrBarcodeDetector | null,
): Promise<string | null> {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return null;

  if (barcodeDetector) {
    try {
      const codes = await barcodeDetector.detect(video);
      const raw = codes.find((item: { rawValue?: string }) => item.rawValue)?.rawValue;
      if (raw) return raw;
    } catch {
      /* fall through to canvas decode */
    }
  }

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (!width || !height) return null;

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, width, height);
  const image = ctx.getImageData(0, 0, width, height);
  const code = jsQR(image.data, width, height, { inversionAttempts: "dontInvert" });
  return code?.data ?? null;
}

export function VisitQrScanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const handledRef = useRef(false);
  const barcodeDetectorRef = useRef<QrBarcodeDetector | null>(null);
  const [phase, setPhase] = useState<ScanPhase>("idle");

  const finish = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    stopStream(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const handlePayload = useCallback(
    (raw: string) => {
      if (handledRef.current) return;
      const path =
        typeof window !== "undefined"
          ? houseVisitPathFromQrPayload(raw, window.location.origin)
          : houseVisitPathFromQrPayload(raw);
      if (!path) {
        toast.error("זה לא QR ביקור של HallowHood");
        return;
      }
      handledRef.current = true;
      finish();
      onClose();
      router.push(path);
    },
    [finish, onClose, router],
  );

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setPhase("unsupported");
      return;
    }
    setPhase("starting");
    handledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) {
        stopStream(stream);
        setPhase("idle");
        return;
      }
      video.srcObject = stream;
      await video.play();
      const BarcodeDetectorCtor = qrBarcodeDetector();
      if (BarcodeDetectorCtor) {
        try {
          barcodeDetectorRef.current = new BarcodeDetectorCtor({ formats: ["qr_code"] });
        } catch {
          barcodeDetectorRef.current = null;
        }
      }
      setPhase("scanning");

      let detectInFlight = false;
      const tick = () => {
        if (handledRef.current || detectInFlight) {
          if (!handledRef.current) rafRef.current = window.requestAnimationFrame(tick);
          return;
        }
        const el = videoRef.current;
        const canvas = canvasRef.current;
        if (!el || !canvas || streamRef.current !== stream) return;
        detectInFlight = true;
        void detectQrFromVideo(el, canvas, barcodeDetectorRef.current)
          .then((raw) => {
            if (raw) handlePayload(raw);
          })
          .finally(() => {
            detectInFlight = false;
            if (!handledRef.current) rafRef.current = window.requestAnimationFrame(tick);
          });
      };
      rafRef.current = window.requestAnimationFrame(tick);
    } catch {
      setPhase("denied");
      finish();
    }
  }, [finish, handlePayload]);

  const autoStartedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      finish();
      setPhase("idle");
      handledRef.current = false;
      autoStartedRef.current = false;
      return;
    }
    handledRef.current = false;
    if (!autoStartedRef.current) {
      autoStartedRef.current = true;
      void startCamera();
    }
  }, [open, finish, startCamera]);

  useEffect(() => () => finish(), [finish]);

  return (
    <HouseEditModal
      open={open}
      onClose={() => {
        finish();
        onClose();
      }}
      title="סרוק QR לביקור"
      placement="top-safe"
      closeBarClassName="hw-overlay-close-bar--minimal-top-safe"
      className="w-[min(100%-1rem,26rem)] max-w-[calc(100vw-1rem)]"
    >
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-violet-100">
          כוונו את המצלמה אל קוד ה-QR על דף הביקור ליד הדלת. הביקור יירשם באפליקציה הזו — מומלץ באייפון כשהאפליקציה
          מותקנת על המסך.
        </p>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-black ring-1 ring-orange-500/30">
          <video
            ref={videoRef}
            className="size-full object-cover"
            playsInline
            muted
            aria-hidden={phase !== "scanning"}
          />
          {phase !== "scanning" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#12081a]/90 px-4 text-center">
              {phase === "denied" ? (
                <p className="text-base text-orange-100">אין גישה למצלמה. אפשרו מצלמה בהגדרות הדפדפן ונסו שוב.</p>
              ) : phase === "unsupported" ? (
                <p className="text-base text-orange-100">המכשיר לא תומך בסריקה מתוך האפליקציה. השתמשו במצלמת הטלפון.</p>
              ) : (
                <p className="text-base text-violet-100">לחצו להפעלת המצלמה וסרקו את הקוד.</p>
              )}
              {phase !== "unsupported" ? (
                <button
                  type="button"
                  className="rounded-xl bg-orange-500 px-5 py-3 text-lg font-semibold text-black disabled:opacity-60"
                  disabled={phase === "starting"}
                  onClick={() => void startCamera()}
                >
                  {phase === "starting" ? "פותחים מצלמה…" : "הפעל מצלמה"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        <canvas ref={canvasRef} className="hidden" aria-hidden />
      </div>
    </HouseEditModal>
  );
}
