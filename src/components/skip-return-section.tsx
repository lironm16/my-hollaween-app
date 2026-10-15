"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  metaRestoreTriggers,
  primaryRestoreTriggerFromSnapshot,
  skipReturnActiveLabel,
  skipReturnOfferEligible,
  skipReturnOfferLabel,
  skipReturnRuleActive,
} from "@/lib/skip-reasons";
import type { TemporaryRestoreTriggerId } from "@/lib/skip-reasons";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import { cn } from "@/lib/utils";

function RestoreWhenIcon({ trigger }: { trigger: TemporaryRestoreTriggerId }) {
  if (trigger === "not-open") {
    return <span className="skip-restore-when-icon is-open" aria-hidden />;
  }
  return <span className="skip-restore-when-icon is-candy" aria-hidden />;
}

export function SkipReturnSection({
  meta,
  onApprove,
  onRevokeRule,
}: {
  meta: SkippedHouseMeta;
  onApprove: () => void;
  onRevokeRule: () => void;
}) {
  const active = skipReturnRuleActive(meta);
  const offerTrigger = useMemo(
    () => primaryRestoreTriggerFromSnapshot(meta.statusKey),
    [meta.statusKey],
  );
  const displayTrigger =
    (active ? metaRestoreTriggers(meta)[0] : undefined) ?? offerTrigger ?? null;

  if (!skipReturnOfferEligible(meta) || !displayTrigger) return null;

  const label = active
    ? skipReturnActiveLabel(displayTrigger)
    : skipReturnOfferLabel(displayTrigger);

  return (
    <div
      className={cn(
        "skip-return-row route-skipped-row house-skipped-banner mb-2",
        active && "skip-return-row--active",
      )}
      role="status"
    >
      <div className="route-skipped-main min-w-0">
        <RestoreWhenIcon trigger={displayTrigger} />
        <span className="route-skipped-name text-base font-medium text-violet-100">{label}</span>
      </div>
      <Button
        type="button"
        size="sm"
        variant={active ? "outline" : "default"}
        className={cn(
          "route-skipped-restore shrink-0",
          active
            ? "border-violet-400/35 text-violet-100 hover:bg-violet-500/10"
            : "bg-orange-500 text-black hover:bg-orange-400",
        )}
        onClick={active ? onRevokeRule : onApprove}
      >
        {active ? "ביטול" : "הוסף תנאי"}
      </Button>
    </div>
  );
}
