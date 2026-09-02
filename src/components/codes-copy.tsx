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

export function CodesCopy({
  id,
  editCode,
}: {
  id: string;
  editCode?: string;
}) {
  const both = editCode ? `${id} · ${editCode}` : id;
  return (
    <div className="space-y-2 rounded-xl bg-black/35 p-3 ring-1 ring-orange-500/20">
      <CopyLine
        label="מזהה הבית"
        value={id}
        onCopy={() => void copyText(id, "המזהה הועתק")}
      />
      {editCode ? (
        <CopyLine
          label="קוד עריכה"
          value={editCode}
          onCopy={() => void copyText(editCode, "קוד העריכה הועתק")}
        />
      ) : null}
      {editCode ? (
        <Button
          type="button"
          className="h-9 w-full bg-orange-500 text-black hover:bg-orange-400"
          onClick={() => void copyText(both, "המזהה והקוד הועתקו")}
        >
          <Copy className="size-3.5" />
          העתיקו מזהה וקוד יחד
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="h-9 w-full"
          onClick={() => void copyText(id, "המזהה הועתק")}
        >
          <Copy className="size-3.5" />
          העתיקו מזהה
        </Button>
      )}
    </div>
  );
}

function CopyLine({
  label,
  value,
  onCopy,
}: {
  label: string;
  value: string;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-violet-300">{label}</p>
        <p className="truncate font-mono text-lg tracking-wide text-orange-200">{value}</p>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={onCopy}>
        <Copy className="size-3.5" />
        העתיקו
      </Button>
    </div>
  );
}
