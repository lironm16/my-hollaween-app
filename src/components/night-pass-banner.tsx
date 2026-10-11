"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useNightPassDialogOptional } from "@/components/night-pass-dialog-provider";
import { NightPassDeviceStrip } from "@/components/night-pass-device-strip";
import { useCatalog } from "@/hooks/use-catalog";
import { useNightPass } from "@/hooks/use-night-pass";
import { NIGHT_PASS_LOST_EVENT } from "@/lib/night-pass-client";

/** Map strip: unregistered → invite code; registered → same style as admin «תצוגת משתמש». */
export function NightPassBanner() {
  const pass = useNightPass();
  const { catalog } = useCatalog();
  const passDialog = useNightPassDialogOptional();

  useEffect(() => {
    const onLost = () =>
      toast.message("המכשיר הזה אינו רשום יותר — הקוד שוחרר או הועבר למכשיר אחר.", {
        description: "צריכים קוד חדש? פנו לבעלי הבית.",
        duration: 12_000,
      });
    window.addEventListener(NIGHT_PASS_LOST_EVENT, onLost);
    return () => window.removeEventListener(NIGHT_PASS_LOST_EVENT, onLost);
  }, []);

  if (!pass.enabled || pass.viewer === "admin") return null;

  if (pass.registered) {
    return (
      <div className="relative z-30 px-3 py-2">
        <NightPassDeviceStrip
          pass={pass}
          className="rounded-lg"
          onDetails={() => passDialog?.openRegister()}
        />
      </div>
    );
  }

  const hidden = catalog?.hiddenHouseCount ?? 0;
  return (
    <button
      type="button"
      className="relative z-30 block w-full bg-[#2a1638] px-3 py-2 text-center text-base text-orange-100 ring-1 ring-inset ring-orange-500/25"
      onClick={() => passDialog?.openRegister()}
    >
      {hidden > 0 ? `עוד ${hidden} בתים משתתפים זמינים למשתמשים רשומים · ` : "כתובות הבתים זמינות למשתמשים רשומים · "}
      <span className="font-medium text-orange-300 underline underline-offset-2">יש לי קוד</span>
    </button>
  );
}
