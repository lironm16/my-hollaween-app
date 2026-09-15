"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OverlayCloseBar } from "@/components/overlay-close-button";
import {
  setSkipRoutePrompt,
  type RoutePromptKind,
} from "@/lib/route-prompts";
import type { RouteChangeEntry } from "@/lib/route-changes";

function HouseListSection({
  title,
  entries,
  tone,
}: {
  title: string;
  entries: RouteChangeEntry[];
  tone: "remove" | "add";
}) {
  if (entries.length === 0) return null;
  return (
    <section className="min-w-0 space-y-1.5">
      <p
        className={
          tone === "remove"
            ? "text-base font-semibold text-red-200"
            : "text-base font-semibold text-emerald-200"
        }
      >
        {title} ({entries.length})
      </p>
      <ul
        className={
          tone === "remove"
            ? "max-h-36 space-y-2 overflow-y-auto overscroll-contain rounded-lg bg-red-950/30 px-3 py-2 text-base text-red-50 ring-1 ring-red-500/25"
            : "max-h-36 space-y-2 overflow-y-auto overscroll-contain rounded-lg bg-emerald-950/30 px-3 py-2 text-base text-emerald-50 ring-1 ring-emerald-500/25"
        }
      >
        {entries.map((entry) => (
          <li key={`${tone}-${entry.name}`} className="min-w-0">
            <p className="line-clamp-2 break-words font-medium leading-snug">{entry.name}</p>
            {entry.reason ? (
              <p className="truncate text-sm opacity-80">{entry.reason}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RouteConfirmDialog({
  open,
  title,
  description,
  removedHouses,
  addedHouses,
  promptKind,
  confirmLabel = "המשך",
  includeAddsLabel = "עדכון + הוספה למסלול",
  updatesOnlyLabel = "עדכון בלבד",
  cancelLabel = "ביטול",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  removedHouses?: RouteChangeEntry[];
  addedHouses?: RouteChangeEntry[];
  promptKind: RoutePromptKind;
  confirmLabel?: string;
  /** Shown when new houses may join the route. */
  includeAddsLabel?: string;
  /** Shown when applying changes without adding new route stops. */
  updatesOnlyLabel?: string;
  cancelLabel?: string;
  /** When adds are listed, pass whether to include them. Otherwise ignored. */
  onConfirm: (includeNewHouses: boolean) => void;
  onCancel: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const hasAdds = (addedHouses?.length ?? 0) > 0;

  function close() {
    setDontShowAgain(false);
    onCancel();
  }

  function confirm(includeNewHouses: boolean) {
    if (dontShowAgain) setSkipRoutePrompt(promptKind, true);
    setDontShowAgain(false);
    onConfirm(includeNewHouses);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(92dvh,calc(100dvh-1rem))] w-full max-w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden border-orange-500/30 bg-[#160b1f] p-0 text-orange-50 sm:max-w-md"
        dir="rtl"
      >
        <OverlayCloseBar compact title={title} onClose={close} className="shrink-0 border-b border-orange-500/15 pb-2" />
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-6 pt-4">
          <DialogDescription className="text-right text-violet-200">{description}</DialogDescription>
          {(removedHouses?.length ?? 0) > 0 || hasAdds ? (
            <div className="space-y-3">
              <HouseListSection title="יוסרו מהמסלול" entries={removedHouses ?? []} tone="remove" />
              <HouseListSection title="יתווספו למסלול" entries={addedHouses ?? []} tone="add" />
            </div>
          ) : null}
          <label className="flex items-center gap-2 px-1 py-3 text-base text-violet-300">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="size-4 rounded border-orange-500/40"
            />
            לא להציג שוב
          </label>
        </div>
        <DialogFooter className="mx-0 mb-0 mt-2 shrink-0 border-0 bg-transparent p-0 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {hasAdds ? (
            <div className="grid w-full gap-2">
              <Button
                type="button"
                className="min-h-11 bg-orange-500 px-5 text-black hover:bg-orange-400"
                onClick={() => confirm(true)}
              >
                {includeAddsLabel}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-11 px-3"
                  onClick={() => confirm(false)}
                >
                  {updatesOnlyLabel}
                </Button>
                <Button type="button" variant="outline" className="min-h-11 px-3" onClick={close}>
                  {cancelLabel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                type="button"
                className="min-h-11 bg-orange-500 px-5 text-black hover:bg-orange-400"
                onClick={() => confirm(false)}
              >
                {confirmLabel}
              </Button>
              <Button type="button" variant="outline" className="min-h-11 px-5" onClick={close}>
                {cancelLabel}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
