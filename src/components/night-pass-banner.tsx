"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useNightPassDialogOptional } from "@/components/night-pass-dialog-provider";
import { useCatalog } from "@/hooks/use-catalog";
import { useNightPass } from "@/hooks/use-night-pass";
import { NIGHT_PASS_LOST_EVENT } from "@/lib/night-pass-client";

/** Map strip: invite code when not registered. Registered users see status only in the side menu. */
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

  if (!pass.enabled || pass.viewer === "admin" || pass.registered) return null;

  const hidden = catalog?.hiddenHouseCount ?? 0;
  return (
    <button
      type="button"
      className="relative z-30 block w-full bg-[#2a1638] px-3 py-2 text-center text-base text-orange-100 ring-1 ring-inset ring-orange-500/25"
      onClick={() => passDialog?.openRegister()}
    >
      {hidden > 0
        ? `עוד ${hidden} בתים פרטיים זמינים למשתמשים רשומים · `
        : "כתובות בתים פרטיים זמינות למשתמשים רשומים · "}
      <span className="font-medium text-orange-300 underline underline-offset-2">יש לי קוד</span>
    </button>
  );
}
