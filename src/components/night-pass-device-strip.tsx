"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { adminStyleStripClass } from "@/components/admin-style-strip";
import { useLocale } from "@/hooks/use-locale";
import { disconnectNightPassOnDevice, type NightPassState } from "@/lib/night-pass-client";
import { cn } from "@/lib/utils";

/** Menu strip when this device has an active pass — disconnect only, no details popup. */
export function NightPassDeviceStrip({
  pass,
  compact = false,
  className,
  showDisconnect = true,
}: {
  pass: Pick<NightPassState, "holderName" | "holderPhone" | "houseName" | "accessRole">;
  compact?: boolean;
  className?: string;
  showDisconnect?: boolean;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    const ownerRole = pass.accessRole !== "editor";
    if (
      !window.confirm(
        ownerRole ? t("nightPass.stripConfirmOwner") : t("nightPass.stripConfirmEditor"),
      )
    ) {
      return;
    }
    setBusy(true);
    const ok = await disconnectNightPassOnDevice();
    setBusy(false);
    if (ok) {
      toast.success(
        ownerRole
          ? t("nightPass.stripDisconnectSuccessOwner")
          : t("nightPass.stripDisconnectSuccessEditor"),
      );
    } else toast.error(t("nightPass.stripDisconnectFailed"));
  }

  const subtitle = compact
    ? pass.holderName
      ? pass.holderName
      : t("nightPass.stripActive")
    : [pass.holderName ?? t("nightPass.stripRegisteredFallback"), pass.houseName]
        .filter(Boolean)
        .join(" · ");

  return (
    <div className={cn(adminStyleStripClass(className), "items-center")}>
      <div className="min-w-0 flex-1 text-start">
        <p className="text-base font-medium text-orange-100">{t("nightPass.stripConnected")}</p>
        <p className="truncate text-sm text-violet-400">{subtitle}</p>
      </div>
      {showDisconnect ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          className="shrink-0 border-violet-500/30 text-violet-100 hover:bg-violet-950/40"
          onClick={() => void disconnect()}
        >
          {busy ? t("nightPass.stripDisconnecting") : t("nightPass.stripDisconnect")}
        </Button>
      ) : null}
    </div>
  );
}
