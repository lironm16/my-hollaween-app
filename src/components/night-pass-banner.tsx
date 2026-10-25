"use client";

import { useEffect, useState, type MouseEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useNightPassDialogOptional } from "@/components/night-pass-dialog-provider";
import { useCatalog } from "@/hooks/use-catalog";
import { useNightPass } from "@/hooks/use-night-pass";
import type { HouseSet } from "@/lib/house-set";
import { NIGHT_PASS_BANNER_CTA, NIGHT_PASS_OWNER_BANNER_CTA } from "@/lib/night-pass-copy";
import { NIGHT_PASS_LOST_EVENT, type NightPassLostDetail } from "@/lib/night-pass-client";
import { hiddenHouseCountForSet } from "@/lib/night-pass-scope";

const BANNER_DISMISS_SESSION_KEY = "hw_night_pass_map_banner_dismiss";

function readBannerDismissed() {
  try {
    return sessionStorage.getItem(BANNER_DISMISS_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function writeBannerDismissed() {
  try {
    sessionStorage.setItem(BANNER_DISMISS_SESSION_KEY, "1");
  } catch {
    /* private mode */
  }
}

function lostMessage(detail: NightPassLostDetail): string {
  if (detail?.reason === "house_removed") {
    return "המכשיר התנתק — הבית הוסר מהאירוע.";
  }
  if (detail?.reason === "removed") {
    return "המכשיר התנתק — בעלי הבית הסירו אותו מרשימת המכשירים.";
  }
  if (detail?.reason === "reset") {
    return "התנתקת מהמפה כי קוד הכניסה אופס.";
  }
  if (detail?.reason === "taken") {
    return "המכשיר התנתק — נרשם מחדש ממכשיר אחר עם אותו קוד כניסה.";
  }
  return "המכשיר התנתק — אין יותר גישה מאובטחת במכשיר הזה.";
}

function lostDescription(detail: NightPassLostDetail): string | undefined {
  if (detail?.reason === "house_removed") return undefined;
  if (detail?.reason === "removed") {
    return "אפשר לבקש מבעלי הבית הזמנה להתחבר שוב.";
  }
  if (detail?.reason === "reset") {
    return "פנו לבעלי הבית לקוד מעודכן.";
  }
  return undefined;
}

/** Map strip: register CTA when not registered (dismissible for this tab session). */
export function NightPassBanner({ houseSet }: { houseSet: HouseSet }) {
  const pass = useNightPass();
  const { catalog } = useCatalog();
  const passDialog = useNightPassDialogOptional();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(readBannerDismissed());
  }, []);

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

  if (!pass.enabled || pass.viewer === "admin" || pass.registered || dismissed) return null;

  const hidden = hiddenHouseCountForSet(catalog, houseSet);
  const owner = pass.viewer === "owner";
  const cta = owner ? NIGHT_PASS_OWNER_BANNER_CTA : NIGHT_PASS_BANNER_CTA;

  function dismissBanner(event: MouseEvent) {
    event.stopPropagation();
    writeBannerDismissed();
    setDismissed(true);
  }

  return (
    <div className="relative z-30 flex w-full items-stretch bg-[#2a1638] ring-1 ring-inset ring-orange-500/25">
      <button
        type="button"
        className="min-w-0 flex-1 px-3 py-2 text-center text-base text-orange-100"
        onClick={() => (owner ? passDialog?.openOwnerRegister() : passDialog?.openRegister())}
      >
        {hidden > 0
          ? `עוד ${hidden} בתים פרטיים זמינים למכשיר רשום · `
          : "כתובות בתים פרטיים זמינות למכשיר רשום · "}
        <span className="font-medium text-orange-300 underline underline-offset-2">{cta}</span>
      </button>
      <button
        type="button"
        aria-label="סגירת ההודעה"
        onClick={dismissBanner}
        className="flex shrink-0 items-center justify-center border-s border-orange-500/20 px-3 text-violet-300 hover:bg-orange-500/10 hover:text-orange-100"
      >
        <X className="size-5" aria-hidden />
      </button>
    </div>
  );
}
