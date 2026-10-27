"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { usePwaInstall } from "@/components/pwa-install-provider";
import { Button } from "@/components/ui/button";
import { shouldShowPwaInstallButton } from "@/lib/pwa-install";
import { isAndroidDevice } from "@/lib/push-client";
import { useLocale } from "@/hooks/use-locale";
import { cn } from "@/lib/utils";

export function PwaInstallButton({
  variant = "compact",
  className,
  onInstalled,
  showAlways = false,
  forceVisible = false,
}: {
  variant?: "compact" | "prominent";
  className?: string;
  onInstalled?: () => void;
  /** Show in help/Q&A even when native install prompt is unavailable. */
  showAlways?: boolean;
  /** Help accordion — always render (even when already installed as PWA). */
  forceVisible?: boolean;
}) {
  const { canInstall, isPwaInstalled, promptInstall } = usePwaInstall();
  const { t } = useLocale();
  const android = isAndroidDevice();

  if (
    !shouldShowPwaInstallButton({
      canInstall,
      isPwaInstalled,
      showAlways,
      forceVisible,
      alwaysOnAndroid: android,
    })
  ) {
    return null;
  }

  async function onClick() {
    if (!canInstall) return;
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      onInstalled?.();
      toast.success(t("pwaInstall.success"), { closeButton: true });
      return;
    }
    if (outcome === "dismissed" && !android) {
      toast.message(t("pwaInstall.dismissedHint"));
    }
  }

  if (variant === "prominent") {
    return (
      <Button
        type="button"
        size="lg"
        onClick={() => void onClick()}
        className={cn(
          "h-12 w-full justify-center gap-2 bg-orange-500 text-lg text-black hover:bg-orange-400",
          className,
        )}
      >
        <Download className="size-5" aria-hidden />
        {t("pwaInstall.label")}
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-label={t("pwaInstall.label")}
      title={t("pwaInstall.label")}
      onClick={() => void onClick()}
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#1d1028] text-orange-100 ring-1 ring-orange-500/25 hover:bg-orange-500/10",
        className,
      )}
    >
      <Download className="size-5" aria-hidden />
    </button>
  );
}
