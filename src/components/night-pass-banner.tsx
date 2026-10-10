"use client";

import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";
import { useCatalog } from "@/hooks/use-catalog";
import { useNightPass } from "@/hooks/use-night-pass";
import { NIGHT_PASS_LOST_EVENT } from "@/lib/night-pass-client";

/** Map strip: unregistered → invite to enter a code; registered → who this device is. */
export function NightPassBanner() {
  const pass = useNightPass();
  const { catalog } = useCatalog();

  useEffect(() => {
    const onLost = () =>
      toast.message("הכרטיס הזה נרשם עכשיו במכשיר אחר, או שבעלי הבית החליפו אותו.", {
        description: "זה לא אתם? פנו לבעלי הבית לקבלת קוד חדש.",
        duration: 12_000,
      });
    window.addEventListener(NIGHT_PASS_LOST_EVENT, onLost);
    return () => window.removeEventListener(NIGHT_PASS_LOST_EVENT, onLost);
  }, []);

  if (!pass.enabled || pass.viewer === "admin") return null;

  if (pass.registered) {
    return (
      <div className="relative z-30 flex items-center justify-center gap-2 bg-emerald-950/80 px-3 py-1.5 text-center text-sm text-emerald-100 ring-1 ring-inset ring-emerald-500/20">
        <span>רשומים{pass.holderName ? ` · ${pass.holderName}` : ""}</span>
        <Link href="/pass" className="underline underline-offset-2">
          פרטים
        </Link>
      </div>
    );
  }

  const hidden = catalog?.hiddenHouseCount ?? 0;
  return (
    <Link
      href="/pass"
      className="relative z-30 block bg-[#2a1638] px-3 py-2 text-center text-base text-orange-100 ring-1 ring-inset ring-orange-500/25"
    >
      {hidden > 0 ? `עוד ${hidden} בתים משתתפים זמינים למשתמשים רשומים · ` : "כתובות הבתים זמינות למשתמשים רשומים · "}
      <span className="font-medium text-orange-300 underline underline-offset-2">יש לי קוד</span>
    </Link>
  );
}
