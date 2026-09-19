"use client";

import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { HouseEditModal } from "@/components/house-edit-modal";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/copy-text";
import { houseHeadline } from "@/lib/labels";
import { shareEditCode } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";

export function EditCodeDialog({
  open,
  house,
  editCode,
  onClose,
}: {
  open: boolean;
  house: PublicHouse;
  editCode: string;
  onClose: () => void;
}) {
  return (
    <HouseEditModal
      open={open}
      onClose={onClose}
      title="קוד עריכה"
      subtitle={houseHeadline(house)}
    >
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-violet-100">
          שתפו את הקוד עם מי שצריך לערוך את הבית. אחרי הזנה פעם אחת הקוד נשמר במכשיר שלהם.
        </p>
        <div className="space-y-2">
          <label htmlFor="edit-code-field" className="text-base text-violet-300">
            קוד עריכה (6 ספרות)
          </label>
          <input
            id="edit-code-field"
            readOnly
            value={editCode}
            dir="ltr"
            className="w-full rounded-xl border border-orange-500/25 bg-black/35 px-4 py-3 text-center font-mono text-2xl tracking-[0.25em] text-orange-100 outline-none ring-orange-500/20 focus:ring-2"
            onFocus={(event) => event.target.select()}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full text-lg"
            onClick={() => void copyText(editCode, "קוד העריכה הועתק")}
          >
            <Copy className="size-5" />
            העתיקו
          </Button>
        </div>
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            className="min-w-0 flex-1 bg-orange-500 text-lg text-black hover:bg-orange-400"
            onClick={() => {
              void shareEditCode(house, editCode).then((result) => {
                if (result === "shared") toast.success("קוד העריכה נשלח");
                if (result === "copied") toast.success("קוד העריכה הועתק");
                if (result === "failed") toast.error("לא הצלחנו לשתף את הקוד");
              });
            }}
          >
            <Share2 className="size-5" />
            שיתוף
          </Button>
          <Button type="button" variant="outline" className="min-w-0 flex-1 text-lg" onClick={onClose}>
            סגירה
          </Button>
        </div>
      </div>
    </HouseEditModal>
  );
}
