/** Remember iOS orientation prompt across deploys / PWA reloads (not just one tab session). */
const ORIENTATION_GRANTED_KEY = "hw-gem-hunt-orientation-granted";
const CAMERA_GRANTED_KEY = "hw-gem-hunt-camera-granted";
/** Legacy — migrate once from sessionStorage. */
const ORIENTATION_SESSION_KEY = ORIENTATION_GRANTED_KEY;

let sharedCameraStream: MediaStream | null = null;

function readGranted(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(key) === "1") return true;
  } catch {
    /* ignore */
  }
  return false;
}

function writeGranted(key: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, "1");
  } catch {
    /* ignore */
  }
}

function migrateOrientationSessionFlag() {
  if (typeof window === "undefined") return;
  if (readGranted(ORIENTATION_GRANTED_KEY)) return;
  try {
    if (sessionStorage.getItem(ORIENTATION_SESSION_KEY) === "1") {
      writeGranted(ORIENTATION_GRANTED_KEY);
      sessionStorage.removeItem(ORIENTATION_SESSION_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getGemHuntCameraStream() {
  if (sharedCameraStream?.active) return sharedCameraStream;
  return null;
}

export function stopGemHuntCameraStream() {
  sharedCameraStream?.getTracks().forEach((t) => t.stop());
  sharedCameraStream = null;
}

/**
 * Stop tracks and detach video — turns off the iOS camera indicator (green dot).
 * Site camera permission stays granted; the next hunt should call getUserMedia without
 * a new system prompt (standard Safari / PWA behavior).
 */
export function releaseGemHuntCamera(video?: HTMLVideoElement | null) {
  if (video) {
    try {
      video.pause();
    } catch {
      /* ignore */
    }
    video.srcObject = null;
  }
  stopGemHuntCameraStream();
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") stopGemHuntCameraStream();
  });
}

function clearOrientationGranted() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ORIENTATION_GRANTED_KEY);
  } catch {
    /* ignore */
  }
}

export function isGemHuntOrientationGranted() {
  if (typeof window === "undefined") return false;
  if (!("DeviceOrientationEvent" in window)) return false;
  migrateOrientationSessionFlag();
  const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof ctor.requestPermission !== "function") return true;
  return readGranted(ORIENTATION_GRANTED_KEY);
}

/** iOS Safari / PWA — must run inside a tap handler (same tick as click). */
export async function requestGemHuntOrientationPermission(options?: {
  /** Re-show iOS prompt when opening nav hint (stored grant ≠ live events). */
  force?: boolean;
}): Promise<boolean> {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return false;
  migrateOrientationSessionFlag();
  const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof ctor.requestPermission !== "function") return true;
  const force = options?.force === true;
  if (!force && isGemHuntOrientationGranted()) return true;
  try {
    const result = await ctor.requestPermission();
    if (result === "granted") {
      writeGranted(ORIENTATION_GRANTED_KEY);
      return true;
    }
    clearOrientationGranted();
    return false;
  } catch {
    clearOrientationGranted();
    return false;
  }
}

export type PrepareGemHuntSensorsOptions = {
  /** Default true — set false to only request compass (save battery until in range). */
  requestCamera?: boolean;
  requestOrientation?: boolean;
};

/**
 * Call from a tap handler before opening the hunt overlay (iOS needs gesture for first
 * camera / motion prompt). After the user grants once per origin, killing the stream
 * on close and calling getUserMedia again should not re-show those dialogs.
 */
export async function prepareGemHuntSensors(
  options: PrepareGemHuntSensorsOptions = {},
): Promise<{
  camera: boolean;
  orientation: boolean;
}> {
  const requestCamera = options.requestCamera !== false;
  const requestOrientation = options.requestOrientation !== false;
  let orientation = !requestOrientation ? false : isGemHuntOrientationGranted();
  let camera = !requestCamera ? false : true;

  migrateOrientationSessionFlag();

  if (requestOrientation && !orientation) {
    orientation = await requestGemHuntOrientationPermission();
  }

  if (
    requestCamera &&
    typeof navigator !== "undefined" &&
    navigator.mediaDevices?.getUserMedia
  ) {
    try {
      const liveTracks = sharedCameraStream?.getVideoTracks().filter((t) => t.readyState === "live");
      if (liveTracks && liveTracks.length > 0) {
        liveTracks.forEach((t) => {
          t.enabled = true;
        });
        writeGranted(CAMERA_GRANTED_KEY);
      } else {
        stopGemHuntCameraStream();
        sharedCameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        writeGranted(CAMERA_GRANTED_KEY);
      }
    } catch {
      camera = false;
      stopGemHuntCameraStream();
    }
  } else if (requestCamera) {
    camera = false;
  }

  return { camera, orientation };
}
