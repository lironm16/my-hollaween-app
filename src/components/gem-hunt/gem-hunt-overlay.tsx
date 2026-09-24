"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Navigation } from "lucide-react";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import { OverlayCloseButton } from "@/components/overlay-close-button";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import { getGemHuntCameraStream } from "@/lib/gem-hunt-sensors";
import {
  facingHouse,
  GEM_FACING_TOLERANCE_DEG,
  GEM_HELP_AFTER_SECONDS,
  GEM_HUNT_METERS,
  GEM_SCAN_PAN_DEGREES,
  GEM_SCAN_REVEAL_SECONDS,
  GEM_COLLECT_ANIMATION_MS,
  gemAnchorForHouse,
  gemLabelHe,
  gemMonsterForHouse,
  gemScreenPlacement,
  relativeWalkBearingDeg,
  type GemMonsterId,
} from "@/lib/gem-hunt";
import { distanceMeters, formatDistance } from "@/lib/geo";
import { googleMapsNavigateUrl } from "@/lib/route";
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
  collectEnabled = true,
  onClose,
  onCollect,
}: {
  house: PublicHouse;
  userLocation: UserLocation | null;
  simulateInRange?: boolean;
  /** When false, user can scan and see the gem but cannot collect (preview / too far). */
  collectEnabled?: boolean;
  onClose: () => void;
  onCollect: (monsterId: GemMonsterId) => void;
}) {
  const sim = simulateInRange;
  /** Only auto-reveal from scan/pan/facing when user can collect (or admin simulate). */
  const allowAutoReveal = collectEnabled || sim;
  const monsterId = gemMonsterForHouse(house);
  const anchor = useMemo(() => gemAnchorForHouse(house), [house.id, house.lat, house.lng]);
  /** Admin simulate pretends you are standing at the house pin (for at-home testing). */
  const effectiveLoc = useMemo(() => {
    if (sim) return { lat: house.lat, lng: house.lng, accuracy: 5 };
    return userLocation;
  }, [sim, house.lat, house.lng, userLocation]);
  const distanceM =
    effectiveLoc != null && !sim ? distanceMeters(effectiveLoc, anchor) : null;
  const pinPlacement = useMemo(() => {
    if (!effectiveLoc) return null;
    return gemScreenPlacement(effectiveLoc, anchor, heading);
  }, [anchor, effectiveLoc, heading]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [phase, setPhase] = useState<HuntPhase>("scanning");
  const [hint, setHint] = useState<"scan" | "warm" | "found" | "help">("scan");
  const [showHelp, setShowHelp] = useState(false);
  const [posterHintOpen, setPosterHintOpen] = useState(false);
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
    setPosterHintOpen(false);
  }, [house.id]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function attachCamera() {
      const stream = getGemHuntCameraStream();
      if (!stream) {
        setCameraError("לא ניתן לפתוח מצלמה — אפשר לאסוף מהמפה");
        return;
      }
      if (cancelled) return;
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        try {
          await video.play();
        } catch {
          setCameraError("לא ניתן להציג מצלמה");
        }
      }
    }

    void attachCamera();
    return () => {
      cancelled = true;
      streamRef.current = null;
      const video = videoRef.current;
      if (video) video.srcObject = null;
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

    if (!allowAutoReveal) return;

    const loc = effectiveLoc;
    const facing =
      sim ||
      (loc != null &&
        heading != null &&
        facingHouse(loc, anchor, heading, GEM_FACING_TOLERANCE_DEG));

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
  }, [anchor, effectiveLoc, heading, house, phase, reveal, sim, allowAutoReveal]);

  function handleCollect() {
    if (!collectEnabled) return;
    if (pinPlacement && !pinPlacement.inView) return;
    if (phase === "collecting" || phase === "done") return;
    setPhase("collecting");
    setHint("found");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([20, 40, 60]);
    }
    window.setTimeout(() => {
      setPhase("done");
      onCollect(monsterId);
    }, GEM_COLLECT_ANIMATION_MS);
  }

  function handleHelpReveal() {
    reveal();
    setShowHelp(false);
    setHint("found");
  }

  const gemVisible = phase === "visible" || phase === "collecting";
  const walkBearing =
    effectiveLoc != null ? relativeWalkBearingDeg(effectiveLoc, anchor, heading) : null;
  const facingWalk =
    walkBearing != null && Math.abs(walkBearing) <= GEM_FACING_TOLERANCE_DEG;
  const showWalkGuide =
    !collectEnabled &&
    !sim &&
    effectiveLoc != null &&
    userLocation != null &&
    !sim &&
    distanceM != null &&
    distanceM > 8 &&
    phase !== "collecting";
  const mapsWalkUrl =
    userLocation != null && !sim ? googleMapsNavigateUrl(userLocation, anchor) : null;

  const overlay = (
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
          {!collectEnabled ? (
            <p className="gem-hunt-overlay__badge">
              חיפוש — התקרבו לבית (~{GEM_HUNT_METERS}מ׳) כדי שהאוצר יופיע
              {distanceM != null
                ? userLocation!.accuracy > GEM_HUNT_METERS * 2
                  ? " · GPS לא מדויק — התקרבו פיזית"
                  : ` · עכשיו ~${formatDistance(distanceM)}`
                : userLocation == null
                  ? " · ממתינים ל-GPS"
                  : null}
            </p>
          ) : sim ? (
            <p className="gem-hunt-overlay__badge">סימולציה: בטווח</p>
          ) : null}
          <p className="gem-hunt-overlay__title">מחפשים אוצר נסתר ליד {house.name || house.address}</p>
        </div>
        <OverlayCloseButton
          label="סגירה"
          onClick={onClose}
          className="gem-hunt-overlay__close"
        />
      </header>

      {phase === "collecting" ? (
        <div className="gem-hunt-overlay__collect-flash" aria-hidden />
      ) : null}

      <div className="gem-hunt-overlay__stage" aria-hidden={false}>
        <div className="gem-hunt-overlay__scan-ring" aria-hidden>
          <div className={cn("gem-hunt-overlay__ring", hint === "warm" && "is-warm")} />
        </div>

        {gemVisible ? (
          <button
            type="button"
            className={cn(
              "gem-hunt-overlay__gem-hit",
              pinPlacement && "is-pinned",
              pinPlacement && !pinPlacement.inView && "is-off-screen",
              !pinPlacement && "is-center-fallback",
              phase === "collecting" && "is-collecting",
              !collectEnabled && "is-preview-only",
            )}
            style={
              pinPlacement
                ? {
                    left: `${pinPlacement.xPercent}%`,
                    top: `${pinPlacement.yPercent}%`,
                  }
                : undefined
            }
            onClick={handleCollect}
            aria-label={
              collectEnabled ? `איסוף ${gemLabelHe(monsterId)}` : `תצוגת ${gemLabelHe(monsterId)}`
            }
          >
            <GemSprite
              house={house}
              mode="3d"
              className={cn(phase === "collecting" && "is-burst")}
            />
          </button>
        ) : null}

        <p className={cn("gem-hunt-overlay__hint", gemVisible && "is-gem-visible")}>
          {phase === "collecting" ? "אוצר נאסף!" : null}
          {phase !== "collecting" && hint === "scan" && allowAutoReveal
            ? "סובבו את המצלמה — האוצר ננעץ ליד הבית"
            : null}
          {phase !== "collecting" && hint === "scan" && !allowAutoReveal
            ? "האוצר מוסתר — התקרבו או השתמשו ברמזים"
            : null}
          {phase !== "collecting" && hint === "warm" ? "קרובים! כוונו למקום האוצר…" : null}
          {phase !== "collecting" && hint === "found" && pinPlacement && !pinPlacement.inView
            ? "סובבו את המצלמה — האוצר בקצה המסך"
            : null}
          {phase !== "collecting" && hint === "found" && collectEnabled && (!pinPlacement || pinPlacement.inView)
            ? "לחצו על האוצר לאיסוף!"
            : null}
          {phase !== "collecting" && hint === "found" && !collectEnabled
            ? "זה האוצר של הבית — התקרבו כדי לאסוף"
            : null}
        </p>
      </div>

      {showWalkGuide ? (
        <div className="gem-hunt-overlay__walk-guide" dir="rtl">
          {walkBearing != null ? (
            <div
              className={cn(
                "gem-hunt-overlay__walk-arrow",
                facingWalk && "is-facing",
              )}
              style={{ transform: `rotate(${walkBearing}deg)` }}
              aria-hidden
            >
              <Navigation className="size-9" strokeWidth={2.4} />
            </div>
          ) : null}
          <p className="gem-hunt-overlay__walk-text">
            {walkBearing != null
              ? facingWalk
                ? "המשיכו ישר — הבית מולכם"
                : walkBearing > 0
                  ? "סובבו ימינה לכיוון הבית"
                  : "סובבו שמאלה לכיוון הבית"
              : "התקרבו לבית"}
            {distanceM != null ? ` · ~${formatDistance(distanceM)}` : null}
          </p>
          {mapsWalkUrl ? (
            <a
              href={mapsWalkUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="gem-hunt-overlay__walk-maps"
            >
              הליכה ב-Google Maps
            </a>
          ) : null}
        </div>
      ) : null}

      {phase === "scanning" ? (
        <div className="gem-hunt-overlay__hint-actions" dir="rtl">
          <button
            type="button"
            className="gem-hunt-overlay__hint-btn"
            onClick={() => setPosterHintOpen(true)}
          >
            רמז: איך נראה האוצר?
          </button>
          <button type="button" className="gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--accent" onClick={handleHelpReveal}>
            רמז: גלו את האוצר
          </button>
        </div>
      ) : null}

      {posterHintOpen ? (
        <div className="gem-hunt-overlay__poster-hint" role="dialog" aria-label="תצוגת האוצר">
          <p className="gem-hunt-overlay__poster-kicker">רמז 1</p>
          <p className="gem-hunt-overlay__poster-title">{gemLabelHe(monsterId)}</p>
          <GemSprite house={house} mode="poster" size="lg" className="gem-hunt-overlay__poster-sprite" />
          <p className="gem-hunt-overlay__poster-caption">כך האוצר נראה — חפשו אותו במצלמה</p>
          <button
            type="button"
            className="gem-hunt-overlay__poster-back"
            onClick={() => setPosterHintOpen(false)}
          >
            חזרה למצלמה
          </button>
        </div>
      ) : null}

      {headingStatus === "denied" || headingStatus === "unsupported" ? (
        <p className="gem-hunt-overlay__sensor-note">סריקה לפי זמן — חיישן כיוון לא זמין</p>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
