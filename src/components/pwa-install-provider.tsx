"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { isIosDevice, isStandaloneDisplay } from "@/lib/push-client";
import {
  isPwaInstalledOnDevice,
  markPwaInstalledLocally,
  pwaInstallPromptEligible,
  probeAndroidWebAppInstalled,
  shouldCapturePwaInstallPrompt,
  type DeferredInstallPrompt,
} from "@/lib/pwa-install";
import { isAndroidDevice } from "@/lib/push-client";

type InstallOutcome = "accepted" | "dismissed" | "unavailable";

type PwaInstallContextValue = {
  canInstall: boolean;
  isPwaInstalled: boolean;
  promptInstall: () => Promise<InstallOutcome>;
};

const PwaInstallContext = createContext<PwaInstallContextValue>({
  canInstall: false,
  isPwaInstalled: false,
  promptInstall: async () => "unavailable",
});

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}

function captureDeferredPrompt(event: Event): DeferredInstallPrompt {
  const promptEvent = event as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  };
  return {
    prompt: () => promptEvent.prompt(),
    userChoice: promptEvent.userChoice,
  };
}

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [androidWebAppInstalled, setAndroidWebAppInstalled] = useState(false);

  const isPwaInstalled = isPwaInstalledOnDevice({ isStandalone, androidWebAppInstalled });

  useEffect(() => {
    setIsStandalone(isStandaloneDisplay());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !isAndroidDevice()) return;
    let cancelled = false;
    void probeAndroidWebAppInstalled().then((installed) => {
      if (!cancelled && installed) setAndroidWebAppInstalled(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!shouldCapturePwaInstallPrompt(isIosDevice(), isStandaloneDisplay(), isPwaInstalled)) return;

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(captureDeferredPrompt(event));
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
      markPwaInstalledLocally();
      setIsStandalone(true);
      setAndroidWebAppInstalled(true);
    };

    const onDisplayModeChange = () => {
      setIsStandalone(isStandaloneDisplay());
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    window.matchMedia("(display-mode: standalone)").addEventListener("change", onDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.matchMedia("(display-mode: standalone)").removeEventListener("change", onDisplayModeChange);
    };
  }, [isPwaInstalled]);

  const canInstall = pwaInstallPromptEligible({
    isIos: isIosDevice(),
    isPwaInstalled,
    hasDeferredPrompt: deferredPrompt !== null,
  });

  const promptInstall = useCallback(async (): Promise<InstallOutcome> => {
    if (!deferredPrompt) return "unavailable";
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return outcome;
    } catch {
      setDeferredPrompt(null);
      return "unavailable";
    }
  }, [deferredPrompt]);

  const value = useMemo(
    () => ({ canInstall, isPwaInstalled, promptInstall }),
    [canInstall, isPwaInstalled, promptInstall],
  );

  return <PwaInstallContext.Provider value={value}>{children}</PwaInstallContext.Provider>;
}
