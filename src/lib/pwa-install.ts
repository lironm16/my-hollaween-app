/** Minimal shape of the non-standard beforeinstallprompt event. */
export type DeferredInstallPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export const PWA_INSTALLED_STORAGE_KEY = "hw-pwa-installed";

export function markPwaInstalledLocally() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, "1");
  } catch {
    /* private mode */
  }
}

export function readPwaInstalledLocally() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** True when running as installed PWA or Android reports the web app on device. */
export function isPwaInstalledOnDevice(options: { isStandalone: boolean; androidWebAppInstalled: boolean }) {
  return options.isStandalone || options.androidWebAppInstalled || readPwaInstalledLocally();
}

export function shouldCapturePwaInstallPrompt(
  isIos: boolean,
  isStandalone: boolean,
  isPwaInstalled = isStandalone,
) {
  return !isIos && !isPwaInstalled;
}

export function pwaInstallPromptEligible(options: {
  isIos: boolean;
  isPwaInstalled: boolean;
  hasDeferredPrompt: boolean;
}) {
  if (options.isIos || options.isPwaInstalled) return false;
  return options.hasDeferredPrompt;
}

/** Toast when help/demo install is tapped without a native prompt (e.g. iOS viewing Android Q&A). */
export const PWA_INSTALL_UNAVAILABLE_TOAST = "פתחו ב-Chrome באנדרואיד כדי להתקין.";

export function shouldShowPwaInstallButton(options: {
  canInstall: boolean;
  isPwaInstalled: boolean;
  /** Help/Q&A demo — show instructional button even without beforeinstallprompt. */
  showAlways?: boolean;
  /** Help accordion — always render the button UI (ignores standalone / prompt state). */
  forceVisible?: boolean;
}) {
  if (options.forceVisible) return true;
  if (options.isPwaInstalled) return false;
  if (options.showAlways) return true;
  return options.canInstall;
}

type InstalledRelatedApp = { platform?: string; id?: string; url?: string };

/** Chrome Android: detect home-screen install while user is in a browser tab. */
export async function probeAndroidWebAppInstalled(): Promise<boolean> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<InstalledRelatedApp[]>;
  };
  if (typeof nav.getInstalledRelatedApps !== "function") return false;
  try {
    const apps = await nav.getInstalledRelatedApps();
    const origin = window.location.origin;
    const installed = apps.some((app) => {
      if (app.platform !== "webapp") return false;
      if (app.id === "/" || app.id === origin || app.id === `${origin}/`) return true;
      if (app.url?.startsWith(origin)) return true;
      return false;
    });
    if (installed) markPwaInstalledLocally();
    return installed;
  } catch {
    return false;
  }
}
