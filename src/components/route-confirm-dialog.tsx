"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  setSkipRoutePrompt,
  type RoutePromptKind,
} from "@/lib/route-prompts";

export function RouteConfirmDialog({
  open,
  title,
  description,
  houses,
  promptKind,
  confirmLabel = "המשך",
  cancelLabel = "ביטול",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  houses?: string[];
  promptKind: RoutePromptKind;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  function close() {
    setDontShowAgain(false);
    onCancel();
  }

  function confirm() {
    if (dontShowAgain) setSkipRoutePrompt(promptKind, true);
    setDontShowAgain(false);
    onConfirm();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && close()}>
      <DialogContent className="border-orange-500/30 bg-[#160b1f] text-orange-50 sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-orange-200">{title}</DialogTitle>
          <DialogDescription className="text-violet-200">{description}</DialogDescription>
        </DialogHeader>
        {houses && houses.length > 0 ? (
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-[#1d1028] px-3 py-2 text-base text-violet-100">
            {houses.map((name) => (
              <li key={name} className="truncate">{name}</li>
            ))}
          </ul>
        ) : null}
        <label className="flex items-center gap-2 text-base text-violet-300">
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(event) => setDontShowAgain(event.target.checked)}
            className="size-4 rounded border-orange-500/40"
          />
          לא להציג שוב
        </label>
        <DialogFooter className="flex flex-row justify-start gap-3 border-0 bg-transparent px-1 pt-2 pb-1">
          <Button
            type="button"
            className="bg-orange-500 text-black hover:bg-orange-400"
            onClick={confirm}
          >
            {confirmLabel}
          </Button>
          <Button type="button" variant="outline" onClick={close}>
            {cancelLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
