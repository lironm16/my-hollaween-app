"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { NIGHT_PASS_LOST_EVENT, type NightPassLostDetail } from "@/lib/night-pass-client";

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

/** Toast when a night-pass session ends — no map banner. */
export function NightPassLostToastListener() {
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
  return null;
}
