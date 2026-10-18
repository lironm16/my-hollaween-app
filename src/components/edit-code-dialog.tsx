"use client";

import { Copy } from "lucide-react";
import { HouseEditModal } from "@/components/house-edit-modal";
import { NightPassesCard } from "@/components/night-passes-card";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/copy-text";
import { editCodeSpecForDisplay, formatEditCodeDisplay } from "@/lib/house-access-code";
import { houseHeadline } from "@/lib/labels";
import type { PublicHouse } from "@/lib/types";

export function EditCodeDialog({
  open,
  house,
  editCode,
  admin = false,
  nightPassesEnabled = false,
  onClose,
}: {
  open: boolean;
  house: PublicHouse;
  editCode: string;
  admin?: boolean;
  /** When true, show devices / invite section below the edit code. */
  nightPassesEnabled?: boolean;
  onClose: () => void;
}) {
  const codeSpec = editCodeSpecForDisplay(editCode);
  const displayCode = formatEditCodeDisplay(editCode);
  const showDevices = nightPassesEnabled || admin;

  return (
    <HouseEditModal
      open={open}
      onClose={onClose}
      title="קוד עריכה ומכשירים"
      subtitle={houseHeadline(house)}
    >
      <div className="space-y-4">
        <p className="text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">
          {showDevices
            ? "קוד הכניסה לעריכה ולחיבור מכשירים. אחרי הזנה פעם אחת נשמר במכשיר — אפשר גם לשלוח קישור הזמנה."
            : "שתפו את הקוד עם מי שצריך לערוך את הבית. אחרי הזנה פעם אחת הקוד נשמר במכשיר שלהם."}
        </p>
        <div className="space-y-2">
          <label htmlFor="edit-code-field" className="text-base text-violet-300">
            קוד כניסה ({codeSpec.labelSuffix})
          </label>
          <input
            id="edit-code-field"
            readOnly
            value={displayCode}
            dir="ltr"
            className="w-full rounded-xl border border-orange-500/25 bg-black/35 px-4 py-3 text-center font-mono text-2xl tracking-[0.25em] text-orange-100 outline-none ring-orange-500/20 focus:ring-2"
            onFocus={(event) => event.target.select()}
          />
          {showDevices ? (
            <div className="flex w-full flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 min-w-0 flex-1 basis-[calc(33%-0.35rem)] gap-1.5 border-orange-500/25 bg-[#1d1028] px-2.5 text-orange-100 hover:bg-orange-500/15 sm:basis-auto sm:flex-initial"
                onClick={() => void copyText(editCode.replace(/\s/g, ""), "קוד הכניסה הועתק")}
              >
                <Copy className="size-4 shrink-0" strokeWidth={2.2} />
                <span className="text-sm">העתק</span>
              </Button>
              <div className="flex min-w-0 flex-1 basis-[calc(66%-0.35rem)] gap-2 sm:basis-auto sm:flex-initial">
                <NightPassesCard
                  houseId={house.id}
                  house={house}
                  admin={admin}
                  embedded
                  showFamilyCode={false}
                  inlineActionsOnly
                />
              </div>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full justify-center text-base"
              onClick={() => void copyText(editCode.replace(/\s/g, ""), "קוד הכניסה הועתק")}
            >
              <Copy className="size-5" />
              העתק
            </Button>
          )}
        </div>
        {showDevices ? (
          <NightPassesCard
            houseId={house.id}
            house={house}
            admin={admin}
            embedded
            showFamilyCode={false}
            hideToolbar
          />
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-center text-base"
          onClick={onClose}
        >
          סגירה
        </Button>
      </div>
    </HouseEditModal>
  );
}
