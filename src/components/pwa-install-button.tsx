"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { usePwaInstall } from "@/components/pwa-install-provider";
import { Button } from "@/components/ui/button";
import {
  PWA_INSTALL_UNAVAILABLE_TOAST,
  shouldShowPwaInstallButton,
} from "@/lib/pwa-install";
import { isStandaloneDisplay } from "@/lib/push-client";
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
  const { canInstall, promptInstall } = usePwaInstall();
  const isStandalone = isStandaloneDisplay();

  if (!shouldShowPwaInstallButton({ canInstall, isStandalone, showAlways, forceVisible })) return null;

  async function onClick() {
    if (!canInstall) {
      toast.message(PWA_INSTALL_UNAVAILABLE_TOAST, { closeButton: true });
      return;
    }
    const outcome = await promptInstall();
    if (outcome === "accepted") {
      onInstalled?.();
      toast.success("האפליקציה הותקנה!", { closeButton: true });
      return;
    }
    if (outcome === "dismissed") {
      toast.message("אפשר להתקין בכל עת מהתפריט או מדף העזרה.");
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
        התקנת האפליקציה
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-label="התקנת האפליקציה"
      title="התקנת האפליקציה"
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
