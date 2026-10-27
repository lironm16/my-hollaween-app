"use client";

import { Copy } from "lucide-react";
import { HouseEditModal } from "@/components/house-edit-modal";
import { NightPassesCard } from "@/components/night-passes-card";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/copy-text";
import {
  editCodeSpecForDisplay,
  formatEditCodeDisplay,
  LEGACY_ALPHABET_ACCESS_CODE_LENGTH,
} from "@/lib/house-access-code";
import { houseHeadline } from "@/lib/labels";
import { useLocale } from "@/hooks/use-locale";
import { formatMessage } from "@/lib/i18n/format";
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
  /** Omit when this device only has a night pass (no edit code on file). */
  editCode?: string;
  admin?: boolean;
  /** When true, show devices / invite section below the edit code. */
  nightPassesEnabled?: boolean;
  onClose: () => void;
}) {
  const { t } = useLocale();
  const code = editCode?.trim() ?? "";
  const showCode = code.length > 0;
  const codeSpec = showCode ? editCodeSpecForDisplay(code) : null;
  const codeSuffix =
    codeSpec?.maxLength === LEGACY_ALPHABET_ACCESS_CODE_LENGTH
      ? t("editCodeDialog.suffix4Legacy")
      : t("editCodeDialog.suffix6Digits");
  const displayCode = showCode ? formatEditCodeDisplay(code) : "";
  const showDevices = nightPassesEnabled || admin;

  return (
    <HouseEditModal
      open={open}
      onClose={onClose}
      title={t("editCodeDialog.title")}
      subtitle={houseHeadline(house)}
    >
      <div className="space-y-4">
        {!showDevices && showCode ? (
          <p className="text-base leading-relaxed text-violet-100 [overflow-wrap:anywhere]">
            {t("editCodeDialog.intro")}
          </p>
        ) : null}
        {showCode ? (
          <div className="space-y-2">
            <label htmlFor="edit-code-field" className="text-base text-violet-300">
              {formatMessage(t("editCodeDialog.accessCode"), { suffix: codeSuffix })}
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
              <div className="flex w-full flex-wrap items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 w-auto max-w-full shrink-0 gap-1.5 whitespace-nowrap border-orange-500/25 bg-[#1d1028] px-2.5 text-orange-100 hover:bg-orange-500/15"
                  onClick={() => void copyText(code.replace(/\s/g, ""), t("editCodeDialog.copied"))}
                >
                  <Copy className="size-4 shrink-0" strokeWidth={2.2} />
                  <span className="text-sm">{t("editCodeDialog.copy")}</span>
                </Button>
                <NightPassesCard
                  houseId={house.id}
                  house={house}
                  admin={admin}
                  embedded
                  showFamilyCode={false}
                  inlineActionsOnly
                />
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full justify-center text-base"
                onClick={() => void copyText(code.replace(/\s/g, ""), t("editCodeDialog.copied"))}
              >
                <Copy className="size-5" />
                {t("editCodeDialog.copy")}
              </Button>
            )}
          </div>
        ) : null}
        {showDevices ? (
          <NightPassesCard
            houseId={house.id}
            house={house}
            admin={admin}
            embedded
            showFamilyCode={!showCode}
            hideToolbar={showCode}
          />
        ) : null}
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full justify-center text-base"
          onClick={onClose}
        >
          {t("common.close")}
        </Button>
      </div>
    </HouseEditModal>
  );
}
