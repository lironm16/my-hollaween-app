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

/** Share the family edit code — house id is not needed for in-card editing. */
export function CodesCopy({ editCode }: { editCode?: string }) {
  if (!editCode) return null;
  return (
    <div className="space-y-2 rounded-xl bg-black/35 p-3 ring-1 ring-orange-500/20">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-violet-300">קוד עריכה למשפחה</p>
          <p className="truncate font-mono text-lg tracking-wide text-orange-200">{editCode}</p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void copyText(editCode, "קוד העריכה הועתק")}
        >
          <Copy className="size-3.5" />
          העתיקו
        </Button>
      </div>
    </div>
  );
}
