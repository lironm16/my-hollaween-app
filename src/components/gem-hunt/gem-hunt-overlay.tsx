"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Navigation } from "lucide-react";
import { GemHuntDirectionRose } from "@/components/gem-hunt/gem-hunt-direction-rose";
import { GemSprite } from "@/components/gem-hunt/gem-sprite";
import { OverlayCloseButton } from "@/components/overlay-close-button";
import { useDeviceHeading } from "@/hooks/use-device-heading";
import {
  getGemHuntCameraStream,
  isGemHuntOrientationGranted,
  prepareGemHuntSensors,
  requestGemHuntOrientationPermission,
  releaseGemHuntCamera,
} from "@/lib/gem-hunt-sensors";
import { gemCollectDanceIndex } from "@/lib/gem-collect-dance";
import {
  facingHouse,
  GEM_FACING_TOLERANCE_DEG,
  GEM_HELP_AFTER_SECONDS,
  GEM_HUNT_METERS,
  bearingDegrees,
  gemDistanceMeters,
  GEM_SCAN_PAN_DEGREES,
  GEM_SCAN_REVEAL_SECONDS,
  GEM_COLLECT_OVERLAY_MS,
  GEM_IN_CAMERA_ALBUM_REVEAL_ENABLED,
  gemAnchorForHouse,
  gemLabelHe,
  gemMonsterForHouse,
  gemScreenPlacement,
  relativeWalkBearingDeg,
  type GemMonsterId,
  type GemCollectFinishOptions,
} from "@/lib/gem-hunt";
import type { PublicHouse } from "@/lib/types";
import { formatDistance } from "@/lib/geo";
import type { UserLocation } from "@/hooks/use-user-location";
import { beginMapListOverlayCapture, endMapListOverlayCapture } from "@/lib/map-list-suspend";
import { googleMapsNavigateUrl } from "@/lib/route";
import { isGemTypeInCollection, loadGemCollected } from "@/lib/gem-progress";
import { GemCollectAlbumReveal } from "@/components/gem-hunt/gem-collect-album-reveal";
import { useGemHuntLocation } from "@/hooks/use-gem-hunt-location";
import { useSmoothedGemPlacement } from "@/hooks/use-smoothed-gem-placement";
import { gemWorldYawRad } from "@/lib/gem-world-yaw";
import { useGemAnchorOverrides } from "@/hooks/use-gem-anchor-overrides";
import { gemWalkGuideCopy } from "@/lib/gem-hunt-walk-guide";
import { cn } from "@/lib/utils";

type HuntPhase = "scanning" | "visible" | "collecting" | "albumReveal" | "done";

function panDelta(prev: number | null, next: number) {
  if (prev == null) return 0;
  let d = Math.abs(next - prev);
  if (d > 180) d = 360 - d;
  return d;
}

function useInspectTapCollect(onCollect: () => void, enabled: boolean) {
  const dragRef = useRef({ x: 0, y: 0, moved: false });
  return useMemo(
    () => ({
      onPointerDown: (event: ReactPointerEvent) => {
        if (!enabled) return;
        dragRef.current = { x: event.clientX, y: event.clientY, moved: false };
      },
      onPointerMove: (event: ReactPointerEvent) => {
        if (!enabled) return;
        const dx = event.clientX - dragRef.current.x;
        const dy = event.clientY - dragRef.current.y;
        if (dx * dx + dy * dy > 64) dragRef.current.moved = true;
      },
      onPointerUp: () => {
        if (!enabled || dragRef.current.moved) return;
        onCollect();
      },
    }),
    [enabled, onCollect],
  );
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
  onCollect: (monsterId: GemMonsterId, options?: GemCollectFinishOptions) => void;
}) {
  const sim = simulateInRange;
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
  const inDistanceBand =
    effectiveLoc != null &&
    !sim &&
    gemDistanceMeters(effectiveLoc, house) <= GEM_HUNT_METERS;
  /** Scan/pan/facing reveal when in range (or admin simulate). */
  const allowAutoReveal = collectEnabled || sim || inDistanceBand;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraRetry, setCameraRetry] = useState(0);
  const cameraBootRef = useRef(false);
  const [phase, setPhase] = useState<HuntPhase>("scanning");
  const [hint, setHint] = useState<"scan" | "warm" | "found" | "help">("scan");
  const [showHelp, setShowHelp] = useState(false);
  const [hintPanel, setHintPanel] = useState<null | "nav">(null);
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
  const [albumShowActions, setAlbumShowActions] = useState(false);
  const [compassRetry, setCompassRetry] = useState(0);

  const huntGps = useGemHuntLocation(!sim);

  const { heading, pitch: devicePitch, status: headingStatus } = useDeviceHeading(true, compassRetry);

  const walkViewer =
    huntGps ??
    (effectiveLoc
      ? { lat: effectiveLoc.lat, lng: effectiveLoc.lng, accuracy: effectiveLoc.accuracy ?? 12 }
      : null);

  /** Freshest GPS for AR pin — keeps the gem on the sidewalk anchor, not on the user. */
  const placementLoc = walkViewer ?? effectiveLoc;

  const worldYawRad = useMemo(() => {
    if (!walkViewer || sim) return null;
    return gemWorldYawRad(anchor, walkViewer);
  }, [anchor.lat, anchor.lng, walkViewer?.lat, walkViewer?.lng, sim]);

  const pinPlacement = useMemo(() => {
    if (!placementLoc) return null;
    return gemScreenPlacement(placementLoc, anchor, heading, devicePitch);
  }, [anchor, placementLoc, heading, devicePitch]);
  const pinDisplay = useSmoothedGemPlacement(pinPlacement, house.id);

  const reveal = useCallback(() => {
    if (revealedRef.current) return;
    revealedRef.current = true;
    setPhase("visible");
    setHint("found");
    setHintPanel(null);
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
    setHintPanel(null);
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
      releaseGemHuntCamera(videoRef.current);
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
          requestOrientation: !isGemHuntOrientationGranted(),
        });
        cameraBootRef.current = false;
        if (cancelled) return;
        if (!prepared.camera) {
          setCameraError("no-camera");
          return;
        }
        stream = getGemHuntCameraStream();
      }
      if (!stream) {
        setCameraError("no-camera");
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
      releaseGemHuntCamera(videoRef.current);
    };
  }, [house.id, cameraRetry, sim]);

  useEffect(() => {
    if (phase !== "scanning" || revealedRef.current) return;

    const locEarly = effectiveLoc;
    const facingClose =
      locEarly != null &&
      heading != null &&
      facingHouse(locEarly, anchor, heading, GEM_FACING_TOLERANCE_DEG);
    if (!sim && allowAutoReveal && distanceM != null && distanceM <= 3 && facingClose) {
      reveal();
      return;
    }

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
      !centerReveal && collectEnabled && Boolean(pinPlacement?.inView);
    if (!viaTellMe && !viaPinned) return;
    setPhase("collecting");
    setHint("found");
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([20, 40, 60]);
    }
    if (collectFinishRef.current != null) window.clearTimeout(collectFinishRef.current);
    const entries = loadGemCollected();
    const newAlbumFriend = !isGemTypeInCollection(monsterId, entries);
    setAlbumRevealNewFriend(newAlbumFriend);
    collectFinishRef.current = window.setTimeout(() => {
      collectFinishRef.current = null;
      if (newAlbumFriend) {
        releaseGemHuntCamera(videoRef.current);
        if (GEM_IN_CAMERA_ALBUM_REVEAL_ENABLED) {
          setAlbumRevealPhase("enter");
          setPhase("albumReveal");
        } else {
          onCollectRef.current(monsterId, { cheer: false, navigateStickerBook: true });
        }
      } else {
        onCollectRef.current(monsterId, { cheer: true });
      }
    }, GEM_COLLECT_OVERLAY_MS);
  }

  useEffect(() => {
    if (phase !== "albumReveal") return;
    releaseGemHuntCamera(videoRef.current);
    setAlbumShowActions(false);
    setAlbumRevealPhase("enter");
    const landTimer = window.setTimeout(() => setAlbumRevealPhase("landed"), 720);
    const actionsTimer = window.setTimeout(() => setAlbumShowActions(true), 880);
    return () => {
      window.clearTimeout(landTimer);
      window.clearTimeout(actionsTimer);
    };
  }, [phase, monsterId]);

  function finishNewFriendClose() {
    onCollectRef.current(monsterId, { cheer: true });
  }

  function finishNewFriendStickerBook() {
    onCollectRef.current(monsterId, { cheer: false, navigateStickerBook: true });
  }

  function toggleRevealMe() {
    if (centerReveal) {
      setCenterReveal(false);
      return;
    }
    setHintPanel(null);
    if (!revealedRef.current) reveal();
    setShowHelp(false);
    setHint("found");
    setCenterReveal(true);
  }

  const gemVisible = phase === "visible" || phase === "collecting";
  const showHuntUi = phase !== "albumReveal";
  const collectBanner =
    phase === "collecting"
      ? albumRevealNewFriend
        ? "כל הכבוד!! מצאתם חבר חדש!"
        : `מצאתם שוב את ${gemLabelHe(monsterId)}`
      : null;

  function handleClose() {
    if (phase === "collecting") return;
    if (phase === "albumReveal") {
      if (albumShowActions || albumRevealPhase === "landed") finishNewFriendClose();
      return;
    }
    releaseGemHuntCamera(videoRef.current);
    onClose();
  }

  const turnBearing =
    effectiveLoc != null ? relativeWalkBearingDeg(effectiveLoc, anchor, heading) : null;
  const facingTarget =
    turnBearing != null && Math.abs(turnBearing) <= GEM_FACING_TOLERANCE_DEG;
  /** «גלה לי» only — never auto-switch when close / facing (avoids pin ↔ center flicker). */
  const centerDisplayMode = gemVisible && centerReveal;
  /** Real hunt: compass-pinned gem (tap when in view + in range). */
  const arPinGuideMode = gemVisible && !centerReveal;
  /** Hide off-screen scan pin while nav is open — revealed/collect gem stays visible. */
  const hideScanPinForNav = hintPanel === "nav" && !centerReveal;
  const pinCollectReady =
    arPinGuideMode && collectEnabled && Boolean(pinPlacement?.inView);
  /** Show centered gem after reveal even before «stand still» — tap only when collectEnabled. */
  /** Show when the shared anchor bearing is inside the camera cone — not gated on 25 m. */
  const showWorldGemSprite = Boolean(pinPlacement?.inView);
  const arPinRevealedGem =
    arPinGuideMode &&
    showWorldGemSprite &&
    (phase === "visible" || phase === "collecting");
  const worldLockRevealed = arPinRevealedGem && !centerReveal;
  const arPinTapCollect = arPinRevealedGem && collectEnabled;
  const isFarForHints =
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
  const showDirectionRose =
    hintPanel === "nav" &&
    !centerDisplayMode &&
    huntArrowDeg != null &&
    effectiveLoc != null &&
    userLocation != null &&
    !sim;
  const mapsWalkUrl =
    userLocation != null && !sim
      ? googleMapsNavigateUrl(userLocation, { lat: anchor.lat, lng: anchor.lng })
      : null;
  const walkGuideCopy = gemWalkGuideCopy(
    huntArrowPhoneRelative,
    facingTarget,
    turnBearing,
    gpsBearingToAnchor,
  );
  const showCompassEnable =
    huntArrowMapNorth &&
    (headingStatus === "denied" || headingStatus === "unsupported");
  const showNavCompassPrompt =
    hintPanel === "nav" &&
    !centerReveal &&
    !isFarForHints &&
    (showCompassEnable || headingStatus === "denied" || headingStatus === "idle" || heading == null);

  const canTapCollect =
    phase === "visible" && (centerReveal || collectEnabled || pinCollectReady);
  const inspectTapHandlers = useInspectTapCollect(handleCollect, canTapCollect);
  const onGemInspectTap = () => {
    if (canTapCollect) handleCollect();
  };

  async function retryCompassPermission() {
    const ok = await requestGemHuntOrientationPermission({ force: true });
    if (ok) setCompassRetry((n) => n + 1);
  }

  const toggleHintPanel = useCallback(async () => {
    if (hintPanel === "nav") {
      setHintPanel(null);
      return;
    }
    setCenterReveal(false);
    const ok = await requestGemHuntOrientationPermission({ force: true });
    if (ok) setCompassRetry((n) => n + 1);
    setHintPanel("nav");
  }, [hintPanel]);

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
          phase === "albumReveal" && "gem-hunt-overlay__video--off",
        )}
        playsInline
        muted
        autoPlay
      />
      {cameraError ? (
        <div className="gem-hunt-overlay__camera-banner" role="status">
          <p className="gem-hunt-overlay__camera-banner-title">אין גישה למצלמה</p>
          <p className="gem-hunt-overlay__camera-banner-text">
            אפשר לצוד עם «גלה לי» למטה, או לאשר מצלמה ולנסות שוב.
          </p>
          <button type="button" className="gem-hunt-overlay__fallback-btn" onClick={() => void retryCamera()}>
            נסו שוב — אישור מצלמה
          </button>
        </div>
      ) : null}
      <div className="gem-hunt-overlay__shade" aria-hidden />
      {collectBanner ? (
        <p
          className={cn(
            "gem-hunt-overlay__collect-banner",
            phase === "collecting" && "is-exploding",
          )}
          role="status"
        >
          {collectBanner}
        </p>
      ) : null}
      <header className="gem-hunt-overlay__header gem-hunt-overlay__header--close-only" dir="ltr">
        <OverlayCloseButton
          label="סגירה"
          onClick={handleClose}
          className={cn(
            "gem-hunt-overlay__close",
            (phase === "collecting" ||
              (phase === "albumReveal" && albumRevealPhase === "enter" && !albumShowActions)) &&
              "pointer-events-none opacity-40",
          )}
        />
      </header>

      {phase === "collecting" ? (
        <div className="gem-hunt-overlay__collect-flash" aria-hidden />
      ) : null}

      {showHuntUi ? (
      <div
        className={cn(
          "gem-hunt-overlay__stage",
          (arPinRevealedGem || centerDisplayMode) && "is-gem-interactive",
        )}
        aria-hidden={false}
      >
        {showDirectionRose ? (
          <div className="gem-hunt-overlay__nav-layer" aria-hidden>
            <GemHuntDirectionRose
              bearingDeg={huntArrowDeg!}
              facing={facingTarget && !huntArrowMapNorth}
              className="gem-hunt-overlay__nav-rose gem-hunt-direction-rose--ring"
            />
          </div>
        ) : null}

        {arPinRevealedGem ? (
          <div
            className={cn(
              "gem-hunt-overlay__gem-hit gem-hunt-overlay__gem-pin is-pinned is-pin-collect is-revealed is-inspect360",
              centerReveal && "is-ring-center",
              worldLockRevealed && pinPlacement && !pinPlacement.inView && "is-off-screen",
              phase === "collecting" && "is-collecting",
              pinCollectReady && "is-collect-ready-gem",
              !collectEnabled && phase === "visible" && "is-awaiting-still",
            )}
            style={
              centerReveal || !pinDisplay
                ? undefined
                : {
                    left: `${pinDisplay.xPercent}%`,
                    top: `${pinDisplay.yPercent}%`,
                  }
            }
          >
            <div
              className={cn(
                "gem-hunt-overlay__gem-dance",
                phase === "collecting" && "is-collecting is-collecting-3d",
              )}
              {...inspectTapHandlers}
              onClick={(e) => {
                e.stopPropagation();
                if (canTapCollect) onGemInspectTap();
              }}
            >
              <GemSprite
                house={house}
                mode="inspect360"
                size="fill"
                tapCollect={false}
                spinWhileCollect={false}
                worldYawRad={worldYawRad}
                motion={phase === "collecting" ? "celebrate" : "idle"}
                celebrateVariant={collectDanceIndex}
                onInspectTap={onGemInspectTap}
              />
            </div>
          </div>
        ) : null}

        {arPinGuideMode && !hideScanPinForNav && phase !== "visible" && showWorldGemSprite ? (
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
      </div>
      ) : null}

      {showHuntUi && centerDisplayMode ? (
        <div
          className={cn(
            "gem-hunt-overlay__gem-hit",
            "is-center-collect",
            "is-collect-layer",
            "is-inspect360",
            "is-ring-center",
            phase === "collecting" && "is-collecting",
          )}
        >
          <div
            className={cn(
              "gem-hunt-overlay__gem-dance",
              phase === "collecting" && "is-collecting is-collecting-3d",
            )}
            {...inspectTapHandlers}
            onClick={(e) => {
              e.stopPropagation();
              if (canTapCollect) onGemInspectTap();
            }}
          >
            <GemSprite
              house={house}
              mode="inspect360"
              size="fill"
              tapCollect={false}
              spinWhileCollect={false}
              worldYawRad={worldYawRad}
              motion={phase === "collecting" ? "celebrate" : "idle"}
              celebrateVariant={collectDanceIndex}
              onInspectTap={onGemInspectTap}
            />
          </div>
        </div>
      ) : null}

      {showHuntUi && phase !== "collecting" ? (
        <footer className="gem-hunt-overlay__footer" dir="rtl">
          {showNavCompassPrompt ? (
            <button
              type="button"
              className="gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--compact w-full"
              onClick={() => void retryCompassPermission()}
            >
              אפשרו כיוון (Safari) — לחץ כדי שהחץ יזוז
            </button>
          ) : null}

          <div className="gem-hunt-overlay__footer-stack">
            {hintPanel === "nav" ? (
              <div
                className="gem-hunt-overlay__walk-guide gem-hunt-overlay__walk-guide--hint gem-hunt-overlay__walk-guide--footer"
                role="region"
                aria-label="הנחיות הליכה ליהלום"
              >
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
                  {walkGuideCopy}
                  {distanceM != null ? ` · ${formatDistance(distanceM)}` : null}
                </p>
                {mapsWalkUrl ? (
                  <a
                    href={mapsWalkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="gem-hunt-overlay__walk-maps"
                  >
                    הליכה ב-Google Maps ליהלום
                  </a>
                ) : null}
              </div>
            ) : null}

            <div className="gem-hunt-overlay__hint-actions gem-hunt-overlay__hint-actions--row">
            <button
              type="button"
              className={cn(
                "gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--compact",
                hintPanel === "nav" && "is-active",
              )}
              aria-pressed={hintPanel === "nav"}
              onClick={() => void toggleHintPanel()}
            >
              <span className="gem-hunt-overlay__hint-btn-label">
                <span className="gem-hunt-overlay__hint-btn-title">רמז</span>
                <span className="gem-hunt-overlay__hint-btn-sub">כוון אותי</span>
              </span>
            </button>
            <button
              type="button"
              className={cn(
                "gem-hunt-overlay__hint-btn gem-hunt-overlay__hint-btn--reveal gem-hunt-overlay__hint-btn--compact",
                centerReveal && "is-active",
              )}
              aria-pressed={centerReveal}
              onClick={toggleRevealMe}
            >
              גלה לי
            </button>
          </div>
          </div>
        </footer>
      ) : null}

      {phase === "albumReveal" ? (
        <GemCollectAlbumReveal
          monsterId={monsterId}
          phase={albumRevealPhase}
          newAlbumFriend={albumRevealNewFriend}
          showActions={albumShowActions && albumRevealNewFriend}
          onClose={finishNewFriendClose}
          onOpenStickerBook={finishNewFriendStickerBook}
        />
      ) : null}

    </div>
  );

  if (typeof document === "undefined") return overlay;
  return createPortal(overlay, document.body);
}
