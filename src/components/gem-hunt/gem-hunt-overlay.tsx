"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import { OverlayCloseButton } from "@/components/overlay-close-button";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import {
  facingHouse,
  GEM_FACING_TOLERANCE_DEG,
  GEM_HELP_AFTER_SECONDS,
  GEM_SCAN_PAN_DEGREES,
  GEM_SCAN_REVEAL_SECONDS,
  gemLabelHe,
  gemMonsterForHouse,
  type GemMonsterId,
} from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";
import type { UserLocation } from "@/hooks/use-user-location";
import { cn } from "@/lib/utils";

type HuntPhase = "scanning" | "visible" | "collecting" | "done";

function panDelta(prev: number | null, next: number) {
  if (prev == null) return 0;
  let d = Math.abs(next - prev);
  if (d > 180) d = 360 - d;
  return d;
}

export function GemHuntOverlay({
  house,
  userLocation,
  simulateInRange = false,
  labMode = false,
  onClose,
  onCollect,
}: {
  house: PublicHouse;
  userLocation: UserLocation | null;
  simulateInRange?: boolean;
  /** Admin: skip GPS/scan — show camera + gem for testing anywhere */
  labMode?: boolean;
  onClose: () => void;
  onCollect: (monsterId: GemMonsterId) => void;
}) {
  const sim = simulateInRange || labMode;
  const monsterId = gemMonsterForHouse(house);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [phase, setPhase] = useState<HuntPhase>("scanning");
  const [hint, setHint] = useState<"scan" | "warm" | "found" | "help">("scan");
  const [showHelp, setShowHelp] = useState(false);
  const scanStartRef = useRef(Date.now());
  const panTotalRef = useRef(0);
  const lastHeadingRef = useRef<number | null>(null);
  const facingSinceRef = useRef<number | null>(null);
  const revealedRef = useRef(false);

  const { heading, status: headingStatus } = useDeviceHeading(true);

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setPhase("visible");
    setHint("found");
  }, []);

  useEffect(() => {
    scanStartRef.current = Date.now();
    panTotalRef.current = 0;
    lastHeadingRef.current = heading;
    facingSinceRef.current = null;
    revealedRef.current = false;
    setPhase("scanning");
    setHint("scan");
    setShowHelp(false);
  }, [house.id]);

  useEffect(() => {
    if (!labMode) return;
    const t = window.setTimeout(() => reveal(), 400);
    return () => window.clearTimeout(t);
  }, [house.id, labMode, reveal]);

  useEffect(() => {
    let cancelled = false;
    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("המצלמה לא נתמכת במכשיר זה");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
      } catch {
        setCameraError("לא ניתן לפתוח מצלמה — אפשר לאסוף מהמפה");
      }
    }
    void startCamera();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [house.id]);

  useEffect(() => {
    if (phase !== "scanning" || revealedRef.current) return;

    if (heading != null) {
      panTotalRef.current += panDelta(lastHeadingRef.current, heading);
      lastHeadingRef.current = heading;
    }

    const elapsedSec = (Date.now() - scanStartRef.current) / 1000;
    if (elapsedSec >= GEM_HELP_AFTER_SECONDS) {
      setShowHelp(true);
    }

    if (labMode) return;

    const loc = userLocation ?? (sim ? { lat: house.lat, lng: house.lng, accuracy: 5 } : null);
    const facing =
      sim ||
      (loc != null && heading != null && facingHouse(loc, house, heading, GEM_FACING_TOLERANCE_DEG));

    if (facing) {
      if (facingSinceRef.current == null) facingSinceRef.current = Date.now();
      setHint("warm");
      if (Date.now() - (facingSinceRef.current ?? 0) >= 800) {
        reveal();
        return;
      }
    } else {
      facingSinceRef.current = null;
      setHint("scan");
    }

    if (elapsedSec >= GEM_SCAN_REVEAL_SECONDS || panTotalRef.current >= GEM_SCAN_PAN_DEGREES) {
      reveal();
    }
  }, [heading, house, phase, reveal, sim, labMode, userLocation]);

  function handleCollect() {
    if (phase === "collecting" || phase === "done") return;
    setPhase("collecting");
    window.setTimeout(() => {
      setPhase("done");
      onCollect(monsterId);
    }, 900);
  }

  function handleHelpReveal() {
    reveal();
    setShowHelp(false);
    setHint("found");
  }

  const gemVisible = phase === "visible" || phase === "collecting";

  return (
    <div className="gem-hunt-overlay" dir="rtl">
      {cameraError ? (
        <div className="gem-hunt-overlay__fallback">
          <p className="text-base text-violet-100">{cameraError}</p>
          <button
            type="button"
            className="gem-hunt-overlay__fallback-btn"
            onClick={() => {
              reveal();
              setCameraError(null);
            }}
          >
            הצג אוצר על המסך
          </button>
        </div>
      ) : (
        <video ref={videoRef} className="gem-hunt-overlay__video" playsInline muted autoPlay />
      )}
      <div className="gem-hunt-overlay__shade" aria-hidden />
      <header className="gem-hunt-overlay__header">
        <div className="min-w-0 flex-1">
          {labMode ? (
            <p className="gem-hunt-overlay__badge">מצב ניסיון — בלי GPS</p>
          ) : sim ? (
            <p className="gem-hunt-overlay__badge">סימולציה: בטווח</p>
          ) : null}
          <p className="gem-hunt-overlay__title">מחפשים {gemLabelHe(monsterId)} ליד {house.name || house.address}</p>
        </div>
        <OverlayCloseButton
          label="סגירה"
          onClick={onClose}
          className="gem-hunt-overlay__close"
        />
      </header>

      <div className="gem-hunt-overlay__scan-ring" aria-hidden>
        <div className={cn("gem-hunt-overlay__ring", hint === "warm" && "is-warm")} />
      </div>

      <p className="gem-hunt-overlay__hint">
        {hint === "scan" ? "סרקו לאט את הבית — האוצר יופיע" : null}
        {hint === "warm" ? "קרובים! המשיכו לסרוק…" : null}
        {hint === "found" ? "לחצו על האוצר לאיסוף!" : null}
      </p>

      {gemVisible ? (
        <button
          type="button"
          className={cn("gem-hunt-overlay__gem-hit", phase === "collecting" && "is-collecting")}
          onClick={handleCollect}
          aria-label={`איסוף ${gemLabelHe(monsterId)}`}
        >
          <GemSprite
            house={house}
            mode="3d"
            className={cn(phase === "collecting" && "is-burst")}
          />
        </button>
      ) : null}

      {showHelp && phase === "scanning" ? (
        <button type="button" className="gem-hunt-overlay__help" onClick={handleHelpReveal}>
          לא רואים? לחצו כאן
        </button>
      ) : null}

      {headingStatus === "denied" || headingStatus === "unsupported" ? (
        <p className="gem-hunt-overlay__sensor-note">סריקה לפי זמן — חיישן כיוון לא זמין</p>
      ) : null}
    </div>
  );
}
