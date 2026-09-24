"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Navigation } from "lucide-react";
import { GemOrbitStage } from "@/components/gem-hunt/gem-orbit-stage";
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [phase, setPhase] = useState<HuntPhase>("scanning");
  const [hint, setHint] = useState<"scan" | "warm" | "found" | "help">("scan");
  const [showHelp, setShowHelp] = useState(false);
  const [posterHintOpen, setPosterHintOpen] = useState(false);
  /** User chose «גלה לי» — centered gem on the camera (not orbit hint box). */
  const [centerReveal, setCenterReveal] = useState(false);
  const scanStartRef = useRef(Date.now());
  const panTotalRef = useRef(0);
  const lastHeadingRef = useRef<number | null>(null);
  const facingSinceRef = useRef<number | null>(null);
  const revealedRef = useRef(false);

  const { heading, status: headingStatus } = useDeviceHeading(true);

  const pinPlacement = useMemo(() => {
    if (!effectiveLoc) return null;
    return gemScreenPlacement(effectiveLoc, anchor, heading);
  }, [anchor, effectiveLoc, heading]);

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
    setCenterReveal(false);
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
    if (!centerCollectActive) return;
    if (phase !== "visible") return;
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

  function handleRevealMe() {
    reveal();
    setShowHelp(false);
    setHint("found");
    setCenterReveal(true);
  }

  function handleBackToSearch() {
    setCenterReveal(false);
    revealedRef.current = false;
    facingSinceRef.current = null;
    scanStartRef.current = Date.now();
    panTotalRef.current = 0;
    setPhase("scanning");
    setHint("scan");
    setShowHelp(false);
  }

  const gemVisible = phase === "visible" || phase === "collecting";
  const turnBearing =
    effectiveLoc != null ? relativeWalkBearingDeg(effectiveLoc, anchor, heading) : null;
  const facingTarget =
    turnBearing != null && Math.abs(turnBearing) <= GEM_FACING_TOLERANCE_DEG;
  /** Centered, tappable gem: «גלה לי», sim, or in range + facing anchor (green arrow). */
  const centerCollectActive =
    gemVisible &&
    (centerReveal || sim || (collectEnabled && facingTarget));
  const centerDisplayMode = centerCollectActive;
  /** Compass-pinned guide when not yet centered for collect. */
  const arPinGuideMode = gemVisible && !centerCollectActive;
  const showWalkGuide =
    !collectEnabled &&
    !sim &&
    effectiveLoc != null &&
    userLocation != null &&
    distanceM != null &&
    distanceM > 8 &&
    phase !== "collecting" &&
    !centerReveal;
  /** In-range scan: compass arrow toward the anchor (walk guide covers far mode). */
  const showScanCompass =
    !centerCollectActive &&
    phase !== "collecting" &&
    turnBearing != null &&
    !showWalkGuide &&
    (collectEnabled || sim || allowAutoReveal);
  const mapsWalkUrl =
    userLocation != null && !sim ? googleMapsNavigateUrl(userLocation, anchor) : null;

  const stageScanHint =
    phase === "collecting"
      ? null
      : !gemVisible && hint === "scan" && allowAutoReveal
        ? "סובבו את המצלמה — האוצר ננעץ ליד הבית"
        : !gemVisible && hint === "warm"
          ? "קרובים! כוונו למקום האוצר…"
          : null;

  const footerHint =
    phase === "collecting"
      ? "אוצר נאסף!"
      : centerDisplayMode
        ? "לחצו על האוצר לאיסוף"
        : gemVisible && arPinGuideMode && pinPlacement && !pinPlacement.inView
          ? "סובבו את המצלמה — האוצר בקצה המסך"
          : null;

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
        {!centerDisplayMode ? (
          <div className="gem-hunt-overlay__scan-ring" aria-hidden>
            {showScanCompass ? (
              <div
                className={cn(
                  "gem-hunt-overlay__scan-compass",
                  facingTarget && "is-facing",
                )}
                style={{ transform: `translate(-50%, -50%) rotate(${turnBearing}deg)` }}
                aria-hidden
              >
                <Navigation className="size-10" strokeWidth={2.5} />
              </div>
            ) : null}
            <div
              className={cn(
                "gem-hunt-overlay__ring",
                (hint === "warm" || (facingTarget && (collectEnabled || sim))) && "is-warm",
              )}
            />
          </div>
        ) : null}

        {centerDisplayMode ? (
          <div className="gem-hunt-overlay__scan-ring" aria-hidden>
            <div className="gem-hunt-overlay__ring is-warm" />
          </div>
        ) : null}

        {arPinGuideMode ? (
          <div
            className={cn(
              "gem-hunt-overlay__gem-hit gem-hunt-overlay__gem-pin",
              pinPlacement && "is-pinned",
              pinPlacement && !pinPlacement.inView && "is-off-screen",
              !pinPlacement && "is-center-fallback",
            )}
            style={
              pinPlacement
                ? {
                    left: `${pinPlacement.xPercent}%`,
                    top: `${pinPlacement.yPercent}%`,
                  }
                : undefined
            }
            aria-hidden={false}
            role="img"
            aria-label={`כיוון האוצר — ${gemLabelHe(monsterId)}`}
          >
            <GemSprite house={house} mode="3d" />
          </div>
        ) : null}

        {stageScanHint ? <p className="gem-hunt-overlay__hint">{stageScanHint}</p> : null}
      </div>

      {centerDisplayMode ? (
        <button
          type="button"
          className={cn(
            "gem-hunt-overlay__gem-hit",
            "is-center-collect",
            "is-collect-layer",
            phase === "collecting" && "is-collecting",
          )}
          onClick={handleCollect}
          aria-label={`איסוף ${gemLabelHe(monsterId)}`}
        >
          <GemSprite
            house={house}
            mode="3d"
            tapCollect
            className={cn(phase === "collecting" && "is-burst")}
          />
        </button>
      ) : null}

      {!posterHintOpen && (phase !== "collecting" || footerHint) ? (
        <footer className="gem-hunt-overlay__footer" dir="rtl">
          {footerHint ? (
            <p className="gem-hunt-overlay__footer-hint">{footerHint}</p>
          ) : null}

          {showWalkGuide ? (
            <div className="gem-hunt-overlay__walk-guide">
              {turnBearing != null ? (
                <div
                  className={cn(
                    "gem-hunt-overlay__walk-arrow",
                    facingTarget && "is-facing",
                  )}
                  style={{ transform: `rotate(${turnBearing}deg)` }}
                  aria-hidden
                >
                  <Navigation className="size-9" strokeWidth={2.4} />
                </div>
              ) : null}
              <p className="gem-hunt-overlay__walk-text">
                {turnBearing != null
                  ? facingTarget
                    ? "המשיכו ישר — הבית מולכם"
                    : turnBearing > 0
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

          {phase !== "collecting" && centerDisplayMode ? (
            <button
              type="button"
              className="gem-hunt-overlay__hint-btn"
              onClick={handleBackToSearch}
            >
              חזרה לחיפוש
            </button>
          ) : null}

          {phase !== "collecting" && !centerDisplayMode ? (
            <div className="gem-hunt-overlay__hint-actions gem-hunt-overlay__hint-actions--row">
              <button
                type="button"
                className="gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--compact"
                onClick={() => setPosterHintOpen(true)}
              >
                רמז
              </button>
              <button
                type="button"
                className="gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--accent gem-hunt-overlay__hint-btn--reveal gem-hunt-overlay__hint-btn--compact"
                onClick={handleRevealMe}
              >
                גלה לי
              </button>
            </div>
          ) : null}
        </footer>
      ) : null}

      {posterHintOpen ? (
        <div className="gem-hunt-overlay__poster-hint" role="dialog" aria-label="תצוגת האוצר">
          <p className="gem-hunt-overlay__poster-kicker">רמז 1</p>
          <p className="gem-hunt-overlay__poster-title">{gemLabelHe(monsterId)}</p>
          <GemOrbitStage house={house} stageClassName="gem-hunt-overlay__poster-orbit" />
          <p className="gem-hunt-overlay__poster-caption">כך האוצר נראה במצלמה — אפשר לסובב</p>
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
