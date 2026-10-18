"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useNightPassDialogOptional } from "@/components/night-pass-dialog-provider";
import { useCatalog } from "@/hooks/use-catalog";
import { useNightPass } from "@/hooks/use-night-pass";
import type { HouseSet } from "@/lib/house-set";
import { NIGHT_PASS_BANNER_CTA, NIGHT_PASS_OWNER_BANNER_CTA } from "@/lib/night-pass-copy";
import { NIGHT_PASS_LOST_EVENT, type NightPassLostDetail } from "@/lib/night-pass-client";
import { hiddenHouseCountForSet } from "@/lib/night-pass-scope";

function lostMessage(detail: NightPassLostDetail): string {
  if (detail?.reason === "removed") {
    return "המכשיר התנתק — בעלי הבית הסירו אותו מרשימת המכשירים.";
  }
  if (detail?.reason === "reset") {
    return "המכשיר התנתק — קוד הכניסה אופס. פנו לבעלי הבית לקוד מעודכן.";
  }
  if (detail?.reason === "taken") {
    return "המכשיר התנתק — נרשם מחדש ממכשיר אחר עם אותו קוד כניסה.";
  }
  return "המכשיר התנתק — אין יותר גישה מאובטחת במכשיר הזה.";
}

function lostDescription(detail: NightPassLostDetail): string | undefined {
  if (detail?.reason === "removed") {
    return "אפשר לבקש מבעלי הבית הזמנה להתחבר שוב.";
  }
  if (detail?.reason === "reset") {
    return "קוד הכניסה הישן לא תקף יותר.";
  }
  return undefined;
}

/** Map strip: invite code when not registered. Registered users see status only in the side menu. */
export function NightPassBanner({ houseSet }: { houseSet: HouseSet }) {
  const pass = useNightPass();
  const { catalog } = useCatalog();
  const passDialog = useNightPassDialogOptional();

  useEffect(() => {
    const onLost = (event: Event) => {
      const detail = (event as CustomEvent<NightPassLostDetail>).detail ?? null;
      const description = lostDescription(detail);
      toast.message(lostMessage(detail), {
        ...(description ? { description } : {}),
        duration: 12_000,
      });
    };
    window.addEventListener(NIGHT_PASS_LOST_EVENT, onLost);
    return () => window.removeEventListener(NIGHT_PASS_LOST_EVENT, onLost);
  }, []);

  if (!pass.enabled || pass.viewer === "admin" || pass.registered) return null;

  const hidden = hiddenHouseCountForSet(catalog, houseSet);
  const owner = pass.viewer === "owner";
  const cta = owner ? NIGHT_PASS_OWNER_BANNER_CTA : NIGHT_PASS_BANNER_CTA;
  return (
    <button
      type="button"
      className="relative z-30 block w-full bg-[#2a1638] px-3 py-2 text-center text-base text-orange-100 ring-1 ring-inset ring-orange-500/25"
      onClick={() => (owner ? passDialog?.openOwnerRegister() : passDialog?.openRegister())}
    >
      {hidden > 0
        ? `עוד ${hidden} בתים פרטיים זמינים למכשיר רשום · `
        : "כתובות בתים פרטיים זמינות למכשיר רשום · "}
      <span className="font-medium text-orange-300 underline underline-offset-2">{cta}</span>
    </button>
  );
}
