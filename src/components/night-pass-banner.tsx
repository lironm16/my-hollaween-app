"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useNightPassDialogOptional } from "@/components/night-pass-dialog-provider";
import { useCatalog } from "@/hooks/use-catalog";
import { useNightPass } from "@/hooks/use-night-pass";
import { NIGHT_PASS_BANNER_CTA } from "@/lib/night-pass-copy";
import { NIGHT_PASS_LOST_EVENT, type NightPassLostDetail } from "@/lib/night-pass-client";

function lostMessage(detail: NightPassLostDetail): string {
  if (detail?.reason === "taken") {
    return detail.byName
      ? `המכשיר התנתק — ${detail.byName} נרשם עם קוד הכניסה שלכם במכשיר אחר.`
      : "המכשיר התנתק — מישהו נרשם עם קוד הכניסה שלכם במכשיר אחר.";
  }
  if (detail?.reason === "reset") return "המכשיר התנתק — בעלי הבית יצרו קוד כניסה חדש.";
  return "המכשיר הזה אינו רשום יותר — קוד הכניסה שוחרר או הועבר למכשיר אחר.";
}

/** Map strip: invite code when not registered. Registered users see status only in the side menu. */
export function NightPassBanner() {
  const pass = useNightPass();
  const { catalog } = useCatalog();
  const passDialog = useNightPassDialogOptional();

  useEffect(() => {
    const onLost = (event: Event) =>
      toast.message(lostMessage((event as CustomEvent<NightPassLostDetail>).detail ?? null), {
        description: "צריכים קוד כניסה חדש? פנו לבעלי הבית.",
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
        ? `עוד ${hidden} בתים פרטיים זמינים למכשיר רשום · `
        : "כתובות בתים פרטיים זמינות למכשיר רשום · "}
      <span className="font-medium text-orange-300 underline underline-offset-2">{NIGHT_PASS_BANNER_CTA}</span>
    </button>
  );
}
