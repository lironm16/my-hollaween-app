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

function HouseListSection({
  title,
  names,
  tone,
}: {
  title: string;
  names: string[];
  tone: "remove" | "add";
}) {
  if (names.length === 0) return null;
  return (
    <section className="space-y-1.5">
      <p
        className={
          tone === "remove"
            ? "text-base font-semibold text-red-200"
            : "text-base font-semibold text-emerald-200"
        }
      >
        {title} ({names.length})
      </p>
      <ul
        className={
          tone === "remove"
            ? "max-h-32 space-y-1 overflow-y-auto rounded-lg bg-red-950/30 px-3 py-2 text-base text-red-50 ring-1 ring-red-500/25"
            : "max-h-32 space-y-1 overflow-y-auto rounded-lg bg-emerald-950/30 px-3 py-2 text-base text-emerald-50 ring-1 ring-emerald-500/25"
        }
      >
        {names.map((name) => (
          <li key={`${tone}-${name}`} className="truncate">{name}</li>
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
  cancelLabel = "ביטול",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  removedHouses?: string[];
  addedHouses?: string[];
  promptKind: RoutePromptKind;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When adds are listed, pass whether to include them. Otherwise ignored. */
  onConfirm: (includeNewHouses: boolean) => void;
  onCancel: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [includeAdds, setIncludeAdds] = useState(true);
  const hasAdds = (addedHouses?.length ?? 0) > 0;

  function close() {
    setDontShowAgain(false);
    setIncludeAdds(true);
    onCancel();
  }

  function confirm() {
    if (dontShowAgain) setSkipRoutePrompt(promptKind, true);
    setDontShowAgain(false);
    onConfirm(hasAdds ? includeAdds : false);
    setIncludeAdds(true);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 border-orange-500/30 bg-[#160b1f] p-0 text-orange-50 sm:max-w-md"
        dir="rtl"
      >
        <OverlayCloseBar compact title={title} onClose={close} className="border-b border-orange-500/15 pb-2" />
        <div className="space-y-3 px-6 pt-4">
          <DialogDescription className="text-right text-violet-200">{description}</DialogDescription>
          {(removedHouses?.length ?? 0) > 0 || hasAdds ? (
            <div className="space-y-3">
              <HouseListSection title="יוסרו מהמסלול" names={removedHouses ?? []} tone="remove" />
              <HouseListSection title="יתווספו למסלול" names={addedHouses ?? []} tone="add" />
            </div>
          ) : null}
          {hasAdds ? (
            <label className="flex items-center gap-2 px-1 py-2 text-base text-violet-200">
              <input
                type="checkbox"
                checked={includeAdds}
                onChange={(event) => setIncludeAdds(event.target.checked)}
                className="size-4 rounded border-orange-500/40"
              />
              הוסיפו אותם למסלול
            </label>
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
        <DialogFooter className="mx-0 mb-0 mt-2 border-0 bg-transparent p-0 px-6 pb-6">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              type="button"
              className="min-h-11 bg-orange-500 px-5 text-black hover:bg-orange-400"
              onClick={confirm}
            >
              {confirmLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-11 px-5"
              onClick={close}
            >
              {cancelLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
