"use client";

import { useMemo } from "react";
import {
  metaRestoreTriggers,
  primaryRestoreTriggerFromSnapshot,
  skipReturnOfferEligible,
  skipReturnOfferLabel,
  skipReturnRuleActive,
} from "@/lib/skip-reasons";
import type { SkippedHouseMeta } from "@/lib/offline-db";
import { SkipSign } from "@/components/visit-marks";
import { cn } from "@/lib/utils";

function SkipReturnSwitch({
  on,
  label,
  onChange,
}: {
  on: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative h-7 w-12 shrink-0 rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-orange-500/40",
        on ? "bg-orange-500" : "bg-[#2a1638] ring-1 ring-orange-500/25",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 size-6 rounded-full bg-white shadow transition-[inset-inline-start]",
          on ? "start-5" : "start-0.5",
        )}
      />
    </button>
  );
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

  const label = skipReturnOfferLabel(displayTrigger);

  return (
    <div
      className={cn(
        "skip-return-row route-skipped-row house-skipped-banner mb-2",
        active && "skip-return-row--active",
      )}
      role="status"
    >
      <div className="route-skipped-main min-w-0">
        <SkipSign className="size-8 shrink-0" />
        <span className="route-skipped-name text-base font-medium text-violet-100">{label}</span>
      </div>
      <SkipReturnSwitch
        on={active}
        label={label}
        onChange={(next) => (next ? onApprove() : onRevokeRule())}
      />
    </div>
  );
}
