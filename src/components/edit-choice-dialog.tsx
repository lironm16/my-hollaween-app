"use client";

import { Pencil, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EditChoiceDialog({
  open,
  houseName,
  onQuick,
  onFull,
  onClose,
}: {
  open: boolean;
  houseName: string;
  onQuick: () => void;
  onFull: () => void;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-w-sm border-orange-500/30 bg-[#1d1028] text-orange-50 ring-orange-500/25"
        showCloseButton={false}
      >
        <DialogHeader className="text-center">
          <DialogTitle className="font-display text-xl text-orange-200">עדכון הבית</DialogTitle>
          <DialogDescription className="text-violet-200">{houseName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Button
            type="button"
            className="h-11 w-full justify-center gap-2 bg-orange-500 text-base text-black hover:bg-orange-400"
            onClick={onQuick}
          >
            <Zap className="size-4" />
            עדכון מהיר
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full justify-center gap-2 border-orange-400/40 text-orange-100"
            onClick={onFull}
          >
            <Pencil className="size-4" />
            עריכה מלאה
          </Button>
          <Button type="button" variant="ghost" className="h-10 w-full text-violet-300" onClick={onClose}>
            ביטול
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
