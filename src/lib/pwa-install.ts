/** Minimal shape of the non-standard beforeinstallprompt event. */
export type DeferredInstallPrompt = {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function shouldCapturePwaInstallPrompt(isIos: boolean, isStandalone: boolean) {
  return !isIos && !isStandalone;
}

export function pwaInstallPromptEligible(options: {
  isIos: boolean;
  isStandalone: boolean;
  hasDeferredPrompt: boolean;
}) {
  if (options.isIos || options.isStandalone) return false;
  return options.hasDeferredPrompt;
}
