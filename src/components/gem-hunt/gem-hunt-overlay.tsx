"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Navigation } from "lucide-react";
import { GemOrbitStage } from "@/components/gem-hunt/gem-orbit-stage";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import { OverlayCloseButton } from "@/components/overlay-close-button";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import {
  getGemHuntCameraStream,
  prepareGemHuntSensors,
  requestGemHuntOrientationPermission,
  isGemHuntOrientationGranted,
  stopGemHuntCameraStream,
} from "@/lib/gem-hunt-sensors";
import { gemCollectDanceIndex } from "@/lib/gem-collect-dance";
import {
  facingHouse,
  GEM_FACING_TOLERANCE_DEG,
  GEM_HELP_AFTER_SECONDS,
  GEM_APPROACH_METERS,
  GEM_HUNT_METERS,
  bearingClockLabelHe,
  bearingDegrees,
  gemDistanceMeters,
  GEM_SCAN_PAN_DEGREES,
  GEM_SCAN_REVEAL_SECONDS,
  GEM_COLLECT_OVERLAY_MS,
  GEM_STICKER_REVEAL_MS,
  gemAnchorForHouse,
  gemInScanRing,
  gemPlacementDisplaySnap,
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
import { beginMapListOverlayCapture, endMapListOverlayCapture } from "@/lib/map-list-suspend";
import { isGemCollected, isGemTypeInCollection, loadGemCollected } from "@/lib/gem-progress";
import { GemCollectAlbumReveal } from "@/components/gem-hunt/gem-collect-album-reveal";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { setGemAnchorOverride } from "@/lib/gem-anchor-overrides";
import { cn } from "@/lib/utils";

type HuntPhase = "scanning" | "visible" | "collecting" | "albumReveal" | "done";

function panDelta(prev: number | null, next: number) {
  if (prev == null) return 0;
  let d = Math.abs(next - prev);
  if (d > 180) d = 360 - d;
  return d;
}

async function playCameraOnVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  video.muted = true;
  video.playsInline = true;
  try {
    await video.play();
    return true;
  } catch {
    /* iOS often needs loadedmetadata before play() */
  }
  await new Promise<void>((resolve) => {
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) resolve();
    else video.addEventListener("loadeddata", () => resolve(), { once: true });
  });
  try {
    await video.play();
    return true;
  } catch {
    return false;
  }
}

export function GemHuntOverlay({
  house,
  userLocation,
  simulateInRange = false,
  deferCameraUntilInRange = false,
  collectEnabled = true,
  onClose,
  onCollect,
}: {
  house: PublicHouse;
  userLocation: UserLocation | null;
  simulateInRange?: boolean;
  /** @deprecated Camera always starts immediately; kept for call-site compatibility. */
  deferCameraUntilInRange?: boolean;
  /** When false, user can scan and see the gem but cannot collect (preview / too far). */
  collectEnabled?: boolean;
  onClose: () => void;
  onCollect: (monsterId: GemMonsterId) => void;
}) {
  const sim = simulateInRange;
  /** Only auto-reveal from scan/pan/facing when user can collect (or admin simulate). */
  const allowAutoReveal = collectEnabled || sim;
  const monsterId = gemMonsterForHouse(house);
  const collectDanceIndex = useMemo(
    () => gemCollectDanceIndex(house.id, monsterId),
    [house.id, monsterId],
  );
  const { overrides: anchorOverrides } = useGemAnchorOverrides();
  const anchor = useMemo(
    () => gemAnchorForHouse(house),
    [house.id, house.lat, house.lng, anchorOverrides],
  );
  /** Admin simulate: GPS at the house pin (ground); hunt uses anchor offset + compass like on-site. */
  const effectiveLoc = useMemo(() => {
    if (sim) return { lat: house.lat, lng: house.lng, accuracy: 5 };
    return userLocation;
  }, [sim, house.lat, house.lng, userLocation]);
  const distanceM =
    effectiveLoc != null && !sim ? gemDistanceMeters(effectiveLoc, house) : null;
  const gpsAccuracyM = !sim && userLocation?.accuracy != null ? userLocation.accuracy : null;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRetry, setCameraRetry] = useState(0);
  const cameraBootRef = useRef(false);
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
  const collectFinishRef = useRef<number | null>(null);
  const onCollectRef = useRef(onCollect);
  onCollectRef.current = onCollect;
  const [albumRevealPhase, setAlbumRevealPhase] = useState<"enter" | "landed">("enter");
  /** Snapshot at tap — album sticker was new before this collect. */
  const [albumRevealNewFriend, setAlbumRevealNewFriend] = useState(true);
  const [compassRetry, setCompassRetry] = useState(0);

  const { heading, pitch: devicePitch, status: headingStatus } = useDeviceHeading(true, compassRetry);

  const pinPlacement = useMemo(() => {
    if (!effectiveLoc) return null;
    return gemScreenPlacement(effectiveLoc, anchor, heading, devicePitch);
  }, [anchor, effectiveLoc, heading, devicePitch]);
  const pinDisplay = useMemo(
    () => gemPlacementDisplaySnap(pinPlacement),
    [pinPlacement],
  );

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
    setAlbumRevealPhase("enter");
    if (collectFinishRef.current != null) {
      window.clearTimeout(collectFinishRef.current);
      collectFinishRef.current = null;
    }
  }, [house.id]);

  useEffect(() => {
    beginMapListOverlayCapture();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
      stopGemHuntCameraStream();
      endMapListOverlayCapture();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function attachCamera() {
      let stream = getGemHuntCameraStream();
      if (!stream && !cameraBootRef.current) {
        cameraBootRef.current = true;
        const prepared = await prepareGemHuntSensors({
          requestCamera: true,
          requestOrientation: false,
        });
        cameraBootRef.current = false;
        if (cancelled) return;
        if (!prepared.camera) {
          setCameraError("לא ניתן לפתוח מצלמה — אפשר לאסוף מהמפה");
          return;
        }
        stream = getGemHuntCameraStream();
      }
      if (!stream) {
        setCameraError("לא ניתן לפתוח מצלמה — אפשר לאסוף מהמפה");
        return;
      }
      if (cancelled) return;
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      const ok = await playCameraOnVideo(video, stream);
      if (cancelled) return;
      if (ok) setCameraError(null);
      else setCameraError("לא ניתן להציג מצלמה");
    }

    void attachCamera();
    return () => {
      cancelled = true;
      streamRef.current = null;
    };
  }, [house.id, cameraRetry, sim]);

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
      loc != null &&
      heading != null &&
      facingHouse(loc, anchor, heading, GEM_FACING_TOLERANCE_DEG);

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

    if (
      !sim &&
      (elapsedSec >= GEM_SCAN_REVEAL_SECONDS || panTotalRef.current >= GEM_SCAN_PAN_DEGREES)
    ) {
      reveal();
    }
  }, [anchor, effectiveLoc, heading, house, phase, reveal, sim, allowAutoReveal]);

  function handleCollect() {
    if (phase !== "visible") return;
    const viaTellMe = centerReveal;
    const viaPinned =
      !centerReveal &&
      collectEnabled &&
      Boolean(pinPlacement && gemInScanRing(pinPlacement));
    if (!viaTellMe && !viaPinned) return;
    setPhase("collecting");
    setHint("found");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([20, 40, 60]);
    }
    if (collectFinishRef.current != null) window.clearTimeout(collectFinishRef.current);
    const entries = loadGemCollected();
    const stickerAlreadyInBook =
      isGemTypeInCollection(monsterId, entries) || isGemCollected(house.id);
    setAlbumRevealNewFriend(!stickerAlreadyInBook);
    collectFinishRef.current = window.setTimeout(() => {
      collectFinishRef.current = null;
      setAlbumRevealPhase("enter");
      setPhase("albumReveal");
    }, GEM_COLLECT_OVERLAY_MS);
  }

  useEffect(() => {
    if (phase !== "albumReveal") return;
    const landTimer = window.setTimeout(() => setAlbumRevealPhase("landed"), 720);
    const doneTimer = window.setTimeout(() => {
      onCollectRef.current(monsterId);
    }, GEM_STICKER_REVEAL_MS);
    return () => {
      window.clearTimeout(landTimer);
      window.clearTimeout(doneTimer);
    };
  }, [phase, monsterId]);

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
  const showHuntUi = phase !== "albumReveal";
  const showGpsStaleHint =
    showHuntUi &&
    phase !== "collecting" &&
    distanceM != null &&
    distanceM > 80 &&
    gpsAccuracyM != null &&
    gpsAccuracyM > 45;
  const turnBearing =
    effectiveLoc != null ? relativeWalkBearingDeg(effectiveLoc, anchor, heading) : null;
  const facingTarget =
    turnBearing != null && Math.abs(turnBearing) <= GEM_FACING_TOLERANCE_DEG;
  /** «גלה לי» only — never auto-switch when close / facing (avoids pin ↔ center flicker). */
  const centerDisplayMode = gemVisible && centerReveal;
  /** Real hunt: compass-pinned gem (tap when in view + in range). */
  const arPinGuideMode = gemVisible && !centerReveal;
  const gemInRing = pinPlacement ? gemInScanRing(pinPlacement) : false;
  const pinCollectReady = arPinGuideMode && collectEnabled && gemInRing;
  const ringReady = centerDisplayMode || pinCollectReady;
  const inApproachBand =
    distanceM != null && distanceM <= GEM_APPROACH_METERS && !sim && userLocation != null;
  const showWalkGuide =
    !collectEnabled &&
    !sim &&
    effectiveLoc != null &&
    userLocation != null &&
    distanceM != null &&
    distanceM > GEM_HUNT_METERS &&
    phase !== "collecting" &&
    !centerReveal;
  const gpsBearingToAnchor =
    effectiveLoc != null ? bearingDegrees(effectiveLoc, anchor) : null;
  /** Glowing Navigation arrow — phone-relative when compass works, else map-north bearing. */
  const huntArrowPhoneRelative = heading != null && turnBearing != null;
  const huntArrowDeg = huntArrowPhoneRelative ? turnBearing : gpsBearingToAnchor;
  const huntArrowMapNorth = !huntArrowPhoneRelative && gpsBearingToAnchor != null;
  const showScanArrow =
    !centerDisplayMode &&
    phase !== "collecting" &&
    !showWalkGuide &&
    huntArrowDeg != null &&
    effectiveLoc != null &&
    userLocation != null &&
    !sim &&
    (inApproachBand || collectEnabled || sim);
  const showCompassEnable =
    huntArrowMapNorth &&
    (headingStatus === "denied" || headingStatus === "unsupported");
  const showCompassPending =
    huntArrowMapNorth && headingStatus === "pending" && heading == null;
  const needsLocationForArrow = !sim && userLocation == null && showHuntUi && phase !== "collecting";

  async function retryCompassPermission() {
    const ok = await requestGemHuntOrientationPermission();
    if (ok) setCompassRetry((n) => n + 1);
  }

  const iosOrientationPrompt =
    typeof window !== "undefined" &&
    "DeviceOrientationEvent" in window &&
    typeof (
      DeviceOrientationEvent as typeof DeviceOrientationEvent & {
        requestPermission?: () => Promise<"granted" | "denied">;
      }
    ).requestPermission === "function";
  const showOrientationGate =
    showHuntUi &&
    phase !== "collecting" &&
    !posterHintOpen &&
    iosOrientationPrompt &&
    !isGemHuntOrientationGranted() &&
    (headingStatus === "denied" || headingStatus === "idle");
  const mapsWalkUrl =
    userLocation != null && !sim
      ? googleMapsNavigateUrl(userLocation, { lat: house.lat, lng: house.lng })
      : null;
  const showAtHouseCalibrate =
    !sim &&
    userLocation != null &&
    distanceM != null &&
    distanceM > 40 &&
    phase !== "collecting" &&
    showHuntUi;

  const stageScanHint =
    phase === "collecting"
      ? null
      : !gemVisible && hint === "scan" && allowAutoReveal
        ? "סובבו את המצלמה — היהלום ננעץ ליד הבית"
        : !gemVisible && hint === "warm"
          ? "קרובים! כוונו למקום היהלום…"
          : null;

  const footerHint =
    phase === "collecting"
      ? null
      : centerDisplayMode
        ? "לחצו על היהלום לאיסוף"
        : pinCollectReady
          ? "לחצו על היהלום לאיסוף"
          : gemVisible && arPinGuideMode && pinPlacement?.inView && !gemInRing
            ? "כוונו את היהלום לתוך המעגל הירוק"
            : gemVisible && arPinGuideMode && pinPlacement && !pinPlacement.inView
              ? "סובבו את המצלמה — היהלום בקצה המסך"
              : null;

  function retryCamera() {
    setCameraError(null);
    setCameraRetry((n) => n + 1);
  }

  const overlay = (
    <div className="gem-hunt-overlay" dir="rtl">
      <video
        ref={videoRef}
        className={cn(
          "gem-hunt-overlay__video",
          cameraError && "gem-hunt-overlay__video--behind-fallback",
        )}
        playsInline
        muted
        autoPlay
      />
      {cameraError ? (
        <div className="gem-hunt-overlay__fallback">
          <p className="text-base text-violet-100">{cameraError}</p>
          <button
            type="button"
            className="gem-hunt-overlay__fallback-btn"
            onClick={() => void retryCamera()}
          >
            נסו שוב — הפעלת מצלמה
          </button>
          <button
            type="button"
            className="gem-hunt-overlay__fallback-btn gem-hunt-overlay__fallback-btn--secondary mt-2"
            onClick={() => {
              reveal();
              setCameraError(null);
            }}
          >
            הציגו יהלום על המסך
          </button>
        </div>
      ) : null}
      <div className="gem-hunt-overlay__shade" aria-hidden />
      <header className="gem-hunt-overlay__header">
        <div className="min-w-0 flex-1">
          <p className="gem-hunt-overlay__title">מחפשים יהלום נסתר ליד {house.name || house.address}</p>
        </div>
        <OverlayCloseButton
          label="סגירה"
          onClick={() => {
            if (phase === "collecting" || phase === "albumReveal") return;
            onClose();
          }}
          className={cn(
            "gem-hunt-overlay__close",
            (phase === "collecting" || phase === "albumReveal") && "pointer-events-none opacity-40",
          )}
        />
      </header>

      {phase === "collecting" ? (
        <div className="gem-hunt-overlay__collect-flash" aria-hidden />
      ) : null}

      {showOrientationGate ? (
        <div className="gem-hunt-overlay__orientation-gate" role="dialog" aria-label="אישור כיוון">
          <p className="gem-hunt-overlay__orientation-gate-title">חץ מסתובב עם הטלפון</p>
          <p className="gem-hunt-overlay__orientation-gate-text">
            Safari יציג הודעה — לחצו «אפשר» (אין «תנועה וכיוון» בהגדרות).
          </p>
          <button
            type="button"
            className="gem-hunt-overlay__orientation-gate-btn"
            onClick={() => void retryCompassPermission()}
          >
            המשך — אישור כיוון
          </button>
        </div>
      ) : null}

      {showHuntUi ? (
      <div className="gem-hunt-overlay__stage" aria-hidden={false}>
        <div className="gem-hunt-overlay__scan-ring" aria-hidden>
          {showScanArrow ? (
            <div
              className={cn(
                "gem-hunt-overlay__scan-compass",
                huntArrowMapNorth && "gem-hunt-overlay__scan-compass--map-north",
                !huntArrowMapNorth && facingTarget && "is-facing",
              )}
              style={{ transform: `translate(-50%, -50%) rotate(${huntArrowDeg}deg)` }}
              aria-hidden
            >
              <Navigation className="gem-hunt-overlay__scan-compass-icon" strokeWidth={2.5} />
            </div>
          ) : null}
          <div
            className={cn(
              "gem-hunt-overlay__ring",
              ringReady && "is-collect-ready",
              !ringReady && (hint === "warm" || facingTarget) && "is-warm",
            )}
          />
        </div>

        {arPinGuideMode && pinCollectReady ? (
          <button
            type="button"
            className={cn(
              "gem-hunt-overlay__gem-hit gem-hunt-overlay__gem-pin is-pinned is-pin-collect",
              phase === "collecting" && "is-collecting",
            )}
            style={
              pinDisplay
                ? {
                    left: `${pinDisplay.xPercent}%`,
                    top: `${pinDisplay.yPercent}%`,
                  }
                : undefined
            }
            onClick={handleCollect}
            aria-label={`איסוף ${gemLabelHe(monsterId)}`}
          >
            <div
              className={cn("gem-hunt-overlay__gem-dance", phase === "collecting" && "is-collecting")}
              data-collect-dance={phase === "collecting" ? collectDanceIndex : undefined}
            >
              <GemSprite
                house={house}
                mode="3d"
                tapCollect
                spinWhileCollect={phase !== "collecting"}
              />
            </div>
          </button>
        ) : null}

        {arPinGuideMode && !pinCollectReady ? (
          <div
            className={cn(
              "gem-hunt-overlay__gem-hit gem-hunt-overlay__gem-pin",
              pinPlacement && "is-pinned",
              pinPlacement && !pinPlacement.inView && "is-off-screen",
              !pinPlacement && "is-center-fallback",
            )}
            style={
              pinDisplay
                ? {
                    left: `${pinDisplay.xPercent}%`,
                    top: `${pinDisplay.yPercent}%`,
                  }
                : undefined
            }
            aria-hidden={false}
            role="img"
            aria-label={`כיוון היהלום — ${gemLabelHe(monsterId)}`}
          >
            <GemSprite house={house} mode="poster" />
          </div>
        ) : null}

        {stageScanHint ? <p className="gem-hunt-overlay__hint">{stageScanHint}</p> : null}
      </div>
      ) : null}

      {showHuntUi && centerDisplayMode ? (
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
          <div
            className={cn("gem-hunt-overlay__gem-dance", phase === "collecting" && "is-collecting")}
            data-collect-dance={phase === "collecting" ? collectDanceIndex : undefined}
          >
            <GemSprite
              house={house}
              mode="3d"
              tapCollect
              spinWhileCollect={phase !== "collecting"}
            />
          </div>
        </button>
      ) : null}

      {showHuntUi && !posterHintOpen && (phase !== "collecting" || footerHint) ? (
        <footer className="gem-hunt-overlay__footer" dir="rtl">
          {footerHint ? (
            <p className="gem-hunt-overlay__footer-hint">{footerHint}</p>
          ) : null}

          {showWalkGuide ? (
            <div className="gem-hunt-overlay__walk-guide">
              {huntArrowDeg != null ? (
                <div
                  className={cn(
                    "gem-hunt-overlay__walk-arrow",
                    !huntArrowMapNorth && facingTarget && "is-facing",
                  )}
                  style={{ transform: `rotate(${huntArrowDeg}deg)` }}
                  aria-hidden
                >
                  <Navigation className="size-11" strokeWidth={2.5} />
                </div>
              ) : null}
              <p className="gem-hunt-overlay__walk-text">
                {huntArrowPhoneRelative
                  ? facingTarget
                    ? "המשיכו ישר — הבית מולכם"
                    : turnBearing! > 0
                      ? "סובבו ימינה לכיוון הבית"
                      : "סובבו שמאלה לכיוון הבית"
                  : gpsBearingToAnchor != null
                    ? `כיוון לפי GPS: ${bearingClockLabelHe(gpsBearingToAnchor)} — סובבו את הגוף (צפון = למעלה)`
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

          {showScanArrow && !showWalkGuide ? (
            <p className="gem-hunt-overlay__compass-caption">
              {huntArrowMapNorth
                ? `חץ במעגל = ${bearingClockLabelHe(gpsBearingToAnchor!)} · צפון למעלה`
                : facingTarget
                  ? "מצוין — סובבו את המצלמה עד שהיהלום במעגל"
                  : "חץ לכיוון היהלום — סובבו את הגוף/הטלפון"}
              {distanceM != null ? ` · ~${formatDistance(distanceM)}` : null}
            </p>
          ) : null}

          {showCompassPending ? (
            <p className="gem-hunt-overlay__compass-caption gem-hunt-overlay__compass-caption--muted">
              מחפשים כיוון… נעו את הטלפון בקשת קטנה (כמו «ריסוט»).
            </p>
          ) : null}

          {showAtHouseCalibrate ? (
            <div className="gem-hunt-overlay__walk-guide gem-hunt-overlay__walk-guide--at-house">
              <p className="gem-hunt-overlay__walk-text">
                הגעתם ל{house.name || "הבית"} אבל המרחק גבוה? הסיכה במפה כנראה רחוקה מהכניסה — עדכנו
                מכאן.
              </p>
              <button
                type="button"
                className="gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--accent w-full"
                onClick={() => userLocation && setGemAnchorOverride(house.id, userLocation)}
              >
                אני ליד הבית — עדכן מיקום לאיסוף
              </button>
            </div>
          ) : null}

          {showCompassEnable && !showWalkGuide ? (
            <div className="gem-hunt-overlay__walk-guide gem-hunt-overlay__walk-guide--gps">
              <p className="gem-hunt-overlay__walk-text">
                רוצים חץ שמסתובב עם הטלפון? באייפון אין «תנועה וכיוון» בהגדרות — רק הודעה קופצת
                ב-Safari/PWA.
              </p>
              <button
                type="button"
                className="gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--compact w-full"
                onClick={() => void retryCompassPermission()}
              >
                נסו שוב — «אפשר» בהודעת Safari
              </button>
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
                className="gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--reveal gem-hunt-overlay__hint-btn--compact"
                onClick={handleRevealMe}
              >
                גלה לי
              </button>
            </div>
          ) : null}
        </footer>
      ) : null}

      {posterHintOpen ? (
        <div className="gem-hunt-overlay__poster-hint" role="dialog" aria-label="תצוגת היהלום">
          <p className="gem-hunt-overlay__poster-kicker">רמז 1</p>
          <p className="gem-hunt-overlay__poster-title">{gemLabelHe(monsterId)}</p>
          <GemOrbitStage house={house} stageClassName="gem-hunt-overlay__poster-orbit" />
          <p className="gem-hunt-overlay__poster-caption">כך היהלום נראה במצלמה — אפשר לסובב</p>
          <button
            type="button"
            className="gem-hunt-overlay__poster-back"
            onClick={() => setPosterHintOpen(false)}
          >
            חזרה למצלמה
          </button>
        </div>
      ) : null}

      {needsLocationForArrow ? (
        <p className="gem-hunt-overlay__sensor-note gem-hunt-overlay__sensor-note--alert">
          כדי לראות חץ כיוון — אפשרו מיקום (GPS) לדפדפן
        </p>
      ) : null}

      {showGpsStaleHint ? (
        <p className="gem-hunt-overlay__sensor-note">
          GPS לא מדויק (~{Math.round(gpsAccuracyM!)} מ&apos;) — צאו לרחוב, רעננו, או כיילו נקודת יהלום
          בכרטיס הבית
        </p>
      ) : null}

      {phase === "albumReveal" ? (
        <GemCollectAlbumReveal
          monsterId={monsterId}
          phase={albumRevealPhase}
          newAlbumFriend={albumRevealNewFriend}
        />
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
