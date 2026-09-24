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

async function queryPermissionGranted(name: PermissionName): Promise<boolean | null> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return null;
  try {
    const status = await navigator.permissions.query({ name });
    return status.state === "granted";
  } catch {
    return null;
  }
}

export function getGemHuntCameraStream() {
  if (sharedCameraStream?.active) return sharedCameraStream;
  return null;
}

/** Pause tracks — keeps OS camera grant for the next hunt in the same session. */
export function pauseGemHuntCameraStream() {
  sharedCameraStream?.getVideoTracks().forEach((t) => {
    t.enabled = false;
  });
}

export function stopGemHuntCameraStream() {
  sharedCameraStream?.getTracks().forEach((t) => t.stop());
  sharedCameraStream = null;
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") stopGemHuntCameraStream();
  });
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

/** Call from a click/tap handler before opening the hunt overlay. */
export async function prepareGemHuntSensors(): Promise<{
  camera: boolean;
  orientation: boolean;
}> {
  let orientation = true;
  let camera = true;

  migrateOrientationSessionFlag();

  if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
    const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof ctor.requestPermission === "function" && !readGranted(ORIENTATION_GRANTED_KEY)) {
      try {
        const result = await ctor.requestPermission();
        if (result === "granted") {
          writeGranted(ORIENTATION_GRANTED_KEY);
        } else {
          orientation = false;
        }
      } catch {
        orientation = false;
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    try {
      const liveTracks = sharedCameraStream?.getVideoTracks().filter((t) => t.readyState === "live");
      if (liveTracks && liveTracks.length > 0) {
        liveTracks.forEach((t) => {
          t.enabled = true;
        });
        writeGranted(CAMERA_GRANTED_KEY);
      } else {
        sharedCameraStream = null;
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
  } else {
    camera = false;
  }

  return { camera, orientation };
}
