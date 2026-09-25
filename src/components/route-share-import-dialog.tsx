"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RouteShareImportDialog({
  open,
  stopCount,
  onAccept,
  onDecline,
}: {
  open: boolean;
  stopCount: number;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDecline()}>
      <DialogContent dir="rtl" className="border border-orange-500/30 bg-[#1a0d24] text-orange-50 sm:max-w-md">
        <DialogHeader className="text-right">
          <DialogTitle className="font-display text-xl text-orange-200">מסלול משותף</DialogTitle>
          <DialogDescription className="text-base leading-snug text-violet-200/90">
            התקבל מסלול עם {stopCount} עצירות. להחליף את המסלול הנוכחי? מספרי העצירות יישארו כמו
            אצל מי ששיתף — בלי קשר למיקום שלכם.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row-reverse sm:justify-start">
          <Button type="button" className="bg-orange-500 text-black hover:bg-orange-400" onClick={onAccept}>
            החלפת מסלול
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-violet-500/40 text-violet-100"
            onClick={onDecline}
          >
            לא עכשיו
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
