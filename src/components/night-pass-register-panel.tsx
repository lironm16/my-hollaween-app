"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useNightPass } from "@/hooks/use-night-pass";
import { NIGHT_PASS_REGISTER_SUBTITLE } from "@/lib/night-pass-copy";
import { notifyNightPassSlotsChanged, refreshNightPassState } from "@/lib/night-pass-client";
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
  inviteToken?: string;
  onRegistered?: () => void;
  /** Close the register dialog before in-app navigation (help link). */
  onNavigateAway?: () => void;
  compact?: boolean;
};

/** Redeem a pass code on this device — no «פרטים» screen for already-registered devices. */
export function NightPassRegisterPanel({
  initialCode = "",
  inviteToken = "",
  onRegistered,
  onNavigateAway,
  compact,
}: Props) {
  const pass = useNightPass();
  const { admin } = useAdminSession();
  const [checked, setChecked] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [iosTab, setIosTab] = useState(false);

  const hasInvite = inviteToken.trim().length > 0;
  const hasCode = initialCode.replace(/[\s-]/g, "").length >= 4;

  useEffect(() => {
    setCode((prev) => initialCode || prev);
  }, [initialCode]);

  useEffect(() => {
    const raw = initialCode.replace(/[\s-]/g, "");
    if (raw.length < 4) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/night-passes/prefill?code=${encodeURIComponent(raw)}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as { name?: string; phone?: string };
        if (cancelled) return;
        if (json.name) setName((prev) => (prev.trim() ? prev : json.name!));
        if (json.phone) setPhone((prev) => (prev.trim() ? prev : json.phone!));
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialCode]);

  useEffect(() => {
    setIosTab(isIosBrowserTab());
    void refreshNightPassState({ force: true }).finally(() => setChecked(true));
  }, []);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const endpoint = hasInvite ? "/api/night-passes/redeem-invite" : "/api/night-passes/redeem";
      const body = hasInvite
        ? { invite: inviteToken.trim(), name, phone }
        : { code, name, phone };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        reregistered?: boolean;
        evicted?: boolean;
      } | null;
      if (!res.ok) {
        setError(json?.error ?? "ההרשמה נכשלה. נסו שוב.");
        return;
      }
      await refreshNightPassState({ force: true });
      notifyNightPassSlotsChanged();
      if (json?.evicted) {
        toast.message("4 מכשירים כבר מחוברים — המכשיר הישן ביותר נותק.");
      }
      toast.success(json?.reregistered ? "המכשיר עודכן" : "המכשיר מחובר");
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

  if (pass.registered && !hasCode && !hasInvite) {
    return null;
  }

  if (!open) {
    return (
      <p className="text-base text-violet-200">
        ההרשמה עם קוד כניסה עוד לא נפתחה. נסו שוב בקרוב.
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
      <p className="text-base leading-relaxed text-violet-100">{NIGHT_PASS_REGISTER_SUBTITLE}</p>
      {iosTab ? (
        <p className="rounded-xl bg-amber-950/60 p-3 text-sm text-amber-100 ring-1 ring-amber-500/25">
          באייפון: הירשמו מתוך האפליקציה אם הוספתם אותה למסך הבית.
        </p>
      ) : null}
      {hasInvite ? (
        <p className="rounded-xl bg-emerald-950/50 p-3 text-center text-sm text-emerald-100 ring-1 ring-emerald-500/25">
          הזמנה לבית — מלאו שם ונייד ולחצו «הרשמה».
        </p>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="pass-code">קוד עריכה (4 תווים)</Label>
          <Input
            id="pass-code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            dir="ltr"
            autoCapitalize="characters"
            autoComplete="one-time-code"
            placeholder="K7QM"
            maxLength={4}
            className="h-11 bg-[#12081a] text-center font-mono text-lg tracking-widest"
          />
        </div>
      )}
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
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={busy || (!hasInvite && !code.trim()) || !name.trim() || !phone.trim()}
        className="h-11 w-full bg-orange-500 text-black hover:bg-orange-400"
      >
        {busy ? "נרשמים…" : "הרשמה"}
      </Button>
      {compact ? (
        <Link
          href="/help/event-device-visitor"
          onClick={() => onNavigateAway?.()}
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "w-full text-violet-300 hover:text-violet-100",
          )}
        >
          איך זה עובד?
        </Link>
      ) : null}
      {!compact ? (
        <Link
          href="/"
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full border-violet-500/30 text-violet-200",
          )}
        >
          למפה
        </Link>
      ) : null}
    </form>
  );
}
