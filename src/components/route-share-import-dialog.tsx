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
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
import { cn } from "@/lib/utils";

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
  const { dir, t } = useLocale();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onDecline()}>
      <DialogContent
        dir={dir}
        className="border border-orange-500/30 bg-[#1a0d24] text-orange-50 sm:max-w-md"
      >
        <DialogHeader className={dir === "ltr" ? "text-left" : "text-right"}>
          <DialogTitle className="font-display text-xl text-orange-200">
            {t("routeShareImport.title")}
          </DialogTitle>
          <DialogDescription className="text-base leading-snug text-violet-200/90">
            {formatMessage(t("routeShareImport.body"), { stopCount: String(stopCount) })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter
          className={cn(
            "flex flex-row gap-2 border-0 bg-transparent p-0",
            dir === "ltr" && "flex-row-reverse",
          )}
        >
          <Button
            type="button"
            className="min-h-11 flex-1 bg-orange-500 text-black hover:bg-orange-400"
            onClick={onAccept}
          >
            {t("routeShareImport.accept")}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 border-violet-500/40 text-violet-100"
            onClick={onDecline}
          >
            {t("routeShareImport.decline")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
