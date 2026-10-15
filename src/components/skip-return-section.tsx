"use client";

import { useMemo } from "react";
import { SkipIcon } from "@/components/skip-icon";
import {
  metaRestoreTriggers,
  skipReturnAutoDisplayLabel,
  skipReturnSectionVisible,
} from "@/lib/skip-reasons";
import type { TemporaryRestoreTriggerId } from "@/lib/skip-reasons";
import type { SkippedHouseMeta } from "@/lib/offline-db";

function RestoreWhenIcon({ trigger }: { trigger: TemporaryRestoreTriggerId }) {
  if (trigger === "not-open") {
    return <span className="skip-restore-when-icon is-open" aria-hidden />;
  }
  return <span className="skip-restore-when-icon is-candy" aria-hidden />;
}

export function SkipReturnSection({ meta }: { meta: SkippedHouseMeta }) {
  const label = useMemo(() => skipReturnAutoDisplayLabel(meta), [meta]);
  const triggers = useMemo(() => metaRestoreTriggers(meta), [meta]);

  if (!skipReturnSectionVisible(meta) || !label) return null;

  const showBothIcons =
    triggers.includes("not-open") && triggers.includes("candy-out");

  return (
    <div className="skip-return-section mb-2 flex min-w-0 items-center gap-2.5 py-0.5 text-lg font-medium text-violet-50">
      <SkipIcon className="size-5 shrink-0 text-orange-400" aria-hidden />
      {showBothIcons ? (
        <>
          <RestoreWhenIcon trigger="not-open" />
          <RestoreWhenIcon trigger="candy-out" />
        </>
      ) : triggers[0] ? (
        <RestoreWhenIcon trigger={triggers[0]} />
      ) : null}
      <span className="min-w-0 truncate">{label}</span>
    </div>
  );
}
