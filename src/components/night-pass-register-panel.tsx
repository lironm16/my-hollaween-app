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
import {
  disconnectNightPassOnDevice,
  notifyNightPassSlotsChanged,
  refreshNightPassState,
} from "@/lib/night-pass-client";
import { NIGHT_PASS_REVEAL_HINT } from "@/lib/night-pass-copy";
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
  onPairSuccess?: () => void;
  compact?: boolean;
};

/** Register or show status for the night-pass cookie — used in dialog and /pass redirect. */
export function NightPassRegisterPanel({
  initialCode = "",
  onRegistered,
  onPairSuccess,
  compact,
}: Props) {
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
  const [disconnectBusy, setDisconnectBusy] = useState(false);
  const [pairSuccess, setPairSuccess] = useState(false);

  useEffect(() => {
    setCode((prev) => initialCode || prev);
  }, [initialCode]);

  useEffect(() => {
    const raw = initialCode.replace(/[\s-]/g, "");
    if (raw.length < 8) return;
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
      await refreshNightPassState({ force: true });
      notifyNightPassSlotsChanged();
      setPairSuccess(true);
      onPairSuccess?.();
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

  if (pairSuccess) {
    return (
      <section className="space-y-4">
        <Button
          type="button"
          className="h-11 w-full bg-orange-500 text-black hover:bg-orange-400"
          onClick={() => onRegistered?.()}
        >
          הבנתי
        </Button>
      </section>
    );
  }

  if (pass.registered) {
    return (
      <section className="space-y-3">
        {pass.holderName ? (
          <p className="text-base text-orange-100">{pass.holderName}</p>
        ) : null}
        {pass.holderPhone ? (
          <p className="text-base text-violet-300">
            <bdi dir="ltr" className="inline-block text-orange-100">
              {pass.holderPhone}
            </bdi>
          </p>
        ) : null}
        <p className="text-base text-violet-100">{NIGHT_PASS_REVEAL_HINT}</p>
        <Button
          type="button"
          variant="outline"
          disabled={disconnectBusy}
          className="w-full border-violet-500/30 text-violet-200"
          onClick={() => {
            if (
              !window.confirm(
                "להתנתק מהמכשיר הזה?\n\nהקוד נשאר רשום — אפשר להיכנס שוב עם אותו קוד.",
              )
            ) {
              return;
            }
            setDisconnectBusy(true);
            void disconnectNightPassOnDevice().then((ok) => {
              setDisconnectBusy(false);
              if (ok) toast.success("המכשיר התנתק.");
              else toast.error("ההתנתקות נכשלה.");
            });
          }}
        >
          {disconnectBusy ? "מתנתק…" : "התנתקות מהמכשיר"}
        </Button>
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
      <p className="text-base text-violet-200">
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
      {iosTab ? (
        <p className="rounded-xl bg-amber-950/60 p-3 text-sm text-amber-100 ring-1 ring-amber-500/25">
          באייפון: הירשמו מתוך האפליקציה אם הוספתם אותה למסך הבית.
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
