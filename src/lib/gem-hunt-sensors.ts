/** iOS 13+ — only prompt once per tab session after a user gesture. */
const ORIENTATION_GRANTED_KEY = "hw-gem-hunt-orientation-granted";

let sharedCameraStream: MediaStream | null = null;

export function getGemHuntCameraStream() {
  if (sharedCameraStream?.active) return sharedCameraStream;
  return null;
}

export function stopGemHuntCameraStream() {
  sharedCameraStream?.getTracks().forEach((t) => t.stop());
  sharedCameraStream = null;
}

export function isGemHuntOrientationGranted() {
  if (typeof window === "undefined") return false;
  if (!("DeviceOrientationEvent" in window)) return false;
  const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
    requestPermission?: () => Promise<"granted" | "denied">;
  };
  if (typeof ctor.requestPermission !== "function") return true;
  try {
    return sessionStorage.getItem(ORIENTATION_GRANTED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Call from a click/tap handler before opening the hunt overlay. */
export async function prepareGemHuntSensors(): Promise<{
  camera: boolean;
  orientation: boolean;
}> {
  let orientation = true;
  let camera = true;

  if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
    const ctor = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof ctor.requestPermission === "function") {
      if (!isGemHuntOrientationGranted()) {
        try {
          const result = await ctor.requestPermission();
          if (result === "granted") {
            sessionStorage.setItem(ORIENTATION_GRANTED_KEY, "1");
          } else {
            orientation = false;
          }
        } catch {
          orientation = false;
        }
      }
    }
  }

  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
    try {
      if (!sharedCameraStream?.active) {
        sharedCameraStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
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
