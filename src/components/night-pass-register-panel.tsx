"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useNightPass } from "@/hooks/use-night-pass";
import { config } from "@/lib/config";
import { mergeAddressRevealSchedule } from "@/lib/event-settings";
import { refreshNightPassState } from "@/lib/night-pass-client";
import { cn } from "@/lib/utils";

function isIosBrowserTab() {
  if (typeof window === "undefined") return false;
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !standalone;
}

type Props = {
  initialCode?: string;
  onRegistered?: () => void;
  compact?: boolean;
};

/** Register or show status for the night-pass cookie — used in dialog and /pass redirect. */
export function NightPassRegisterPanel({ initialCode = "", onRegistered, compact }: Props) {
  const pass = useNightPass();
  const { admin } = useAdminSession();
  const { catalog } = useCatalog();
  const [checked, setChecked] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [iosTab, setIosTab] = useState(false);

  useEffect(() => {
    setCode((prev) => initialCode || prev);
  }, [initialCode]);

  useEffect(() => {
    setIosTab(isIosBrowserTab());
    void refreshNightPassState({ force: true }).finally(() => setChecked(true));
  }, []);

  const schedule = mergeAddressRevealSchedule(catalog?.eventSettings?.addressReveal);
  const revealLabel = `${config.eventNight.labelHe} בשעה ${String(schedule.hour).padStart(2, "0")}:${String(schedule.minute).padStart(2, "0")}`;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/night-passes/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, name, phone }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        reregistered?: boolean;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "ההרשמה נכשלה. נסו שוב.");
        return;
      }
      toast.success(json?.reregistered ? "הכרטיס עבר למכשיר הזה" : "נרשמתם!");
      await refreshNightPassState({ force: true });
      onRegistered?.();
    } catch {
      setError("אין חיבור לשרת. נסו שוב כשיש קליטה.");
    } finally {
      setBusy(false);
    }
  }

  const open = pass.enabled || admin;

  if (!checked) {
    return <p className="text-base text-violet-300">בודקים את המכשיר…</p>;
  }

  if (pass.registered) {
    return (
      <section className="space-y-3">
        <p className="text-lg font-medium text-emerald-100">המכשיר הזה רשום</p>
        <p className="text-base text-emerald-50">
          {pass.holderName}
          {pass.holderPhone ? (
            <>
              {" · "}
              <bdi dir="ltr" className="inline-block text-emerald-200">
                {pass.holderPhone}
              </bdi>
            </>
          ) : null}
        </p>
        {pass.houseName ? (
          <p className="text-base text-emerald-200">הקוד התקבל מ: {pass.houseName}</p>
        ) : null}
        <p className="text-base text-violet-100">כתובות הבתים ייפתחו כאן ב-{revealLabel}.</p>
        <p className="rounded-xl bg-black/25 p-3 text-sm text-violet-200">
          מחקתם את האפליקציה או עברתם לטלפון אחר? הזינו שוב את אותו הקוד עם אותו מספר טלפון. הכרטיס
          יעבור למכשיר החדש, והמכשיר הקודם יתנתק.
        </p>
        {!compact ? (
          <Link
            href="/"
            className={cn(
              buttonVariants(),
              "w-full bg-orange-500 text-black hover:bg-orange-400",
            )}
          >
            למפה
          </Link>
        ) : null}
      </section>
    );
  }

  if (!open) {
    return (
      <p className="rounded-2xl bg-[#1d1028] p-4 text-base text-violet-200 ring-1 ring-orange-500/25">
        ההרשמה עם קוד עוד לא נפתחה. נסו שוב בקרוב.
      </p>
    );
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <p className="text-base text-violet-200">
        קיבלתם קוד? הירשמו כדי לראות את כתובות הבתים ביום החשיפה
      </p>
      {iosTab ? (
        <p className="rounded-xl bg-amber-950/60 p-3 text-sm text-amber-100 ring-1 ring-amber-500/25">
          באייפון: אם התקנתם את האפליקציה למסך הבית, הירשמו מתוך האפליקציה. הרשמה כאן בספארי לא
          עוברת אליה (אפשר להירשם שוב באפליקציה עם אותו קוד ואותו טלפון).
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="pass-code">קוד (8 תווים)</Label>
        <Input
          id="pass-code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          dir="ltr"
          autoCapitalize="characters"
          autoComplete="one-time-code"
          placeholder="K7QM-3XPA"
          maxLength={12}
          className="h-11 bg-[#12081a] text-center font-mono text-lg tracking-widest"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pass-name">שם</Label>
        <Input
          id="pass-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          maxLength={40}
          className="h-11 bg-[#12081a]"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pass-phone">טלפון נייד</Label>
        <Input
          id="pass-phone"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="050-1234567"
          maxLength={16}
          className="h-11 bg-[#12081a] text-left"
        />
        <p className="text-sm text-violet-400">
          שמרו את המספר: אם תתקינו מחדש, תצטרכו אותו קוד ואותו טלפון.
        </p>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={busy || !code.trim() || !name.trim() || !phone.trim()}
        className="h-11 w-full bg-orange-500 text-black hover:bg-orange-400"
      >
        {busy ? "נרשמים…" : "הרשמה"}
      </Button>
    </form>
  );
}
