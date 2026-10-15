"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

async function copyText(text: string, ok: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(ok);
  } catch {
    toast.error("לא הצלחנו להעתיק. אפשר לסמן את הטקסט ידנית.");
  }
}

/** Share the single family code — edit unlock and device registration. */
export function CodesCopy({
  editCode,
  hideLabel = false,
}: {
  editCode?: string;
  hideLabel?: boolean;
}) {
  if (!editCode) return null;
  return (
    <div
      className={
        hideLabel
          ? "space-y-2"
          : "space-y-2 rounded-xl bg-black/35 p-3 ring-1 ring-orange-500/20"
      }
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          {!hideLabel ? <p className="text-base text-violet-300">קוד משפחה</p> : null}
          <p className="truncate text-center font-mono text-xl tracking-wide text-orange-200">
            {editCode}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void copyText(editCode, "קוד המשפחה הועתק")}
        >
          <Copy className="size-3.5" />
          העתיקו
        </Button>
      </div>
    </div>
  );
}
