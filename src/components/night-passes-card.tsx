"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SlotView = {
  slot: number;
  code: string;
  status: "unused" | "active";
  holderName: string | null;
  holderPhone: string | null;
  registeredAt: string | null;
  registrations: number;
  resetCount: number;
  resetsLeft: number | null;
};

type PassesResponse = {
  enabled: boolean;
  slots: SlotView[];
  thisDeviceSlot: number | null;
  thisDeviceRegistered: boolean;
  error?: string;
};

function shareText(code: string) {
  const link = `${window.location.origin}/pass?c=${code.replace("-", "")}`;
  return `קוד כניסה ללילה בשכונה: ${code}\nנרשמים כאן: ${link}\nהקוד עובד במכשיר אחד בלבד.`;
}

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("he-IL", {
    day: "numeric",
    month: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Owner / admin: the house's four night-pass codes, who registered each, share and reset. */
export function NightPassesCard({
  houseId,
  admin,
}: {
  houseId: string;
  admin: boolean;
}) {
  const [data, setData] = useState<PassesResponse | null>(null);
  const [error, setError] = useState("");
  const [busySlot, setBusySlot] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(
        `/api/houses/${encodeURIComponent(houseId)}/night-passes`,
        {
          cache: "no-store",
        },
      );
      const json = (await res
        .json()
        .catch(() => null)) as PassesResponse | null;
      if (!res.ok || !json) {
        setError(json?.error ?? "טעינת הכרטיסים נכשלה.");
        return;
      }
      setData(json);
    } catch {
      setError("טעינת הכרטיסים נכשלה.");
    }
  }, [houseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function share(code: string) {
    const text = shareText(code);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* cancelled — fall back to WhatsApp */
      }
    }
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener",
    );
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(shareText(code));
      toast.success("הקוד הועתק");
    } catch {
      toast.message(code);
    }
  }

  async function reset(slot: SlotView) {
    const who = slot.holderName
      ? `המכשיר של ${slot.holderName} יאבד גישה. `
      : "";
    if (!window.confirm(`${who}ייווצר קוד חדש לכרטיס ${slot.slot}. להמשיך?`))
      return;
    setBusySlot(slot.slot);
    try {
      const res = await fetch(
        `/api/houses/${encodeURIComponent(houseId)}/night-passes/reset`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slot: slot.slot }),
        },
      );
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(json?.error ?? "האיפוס נכשל.");
        return;
      }
      toast.success("נוצר קוד חדש");
      await load();
    } finally {
      setBusySlot(null);
    }
  }

  if (!data)
    return error && admin ? (
      <p className="mt-4 text-sm text-red-300">{error}</p>
    ) : null;
  if (!data.enabled && !admin) return null;

  return (
    <section className="mt-4 space-y-3 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
      <div className="space-y-1">
        <h2 className="text-lg font-medium text-orange-200">
          4 כרטיסי כניסה ללילה
        </h2>
        <p className="text-base text-violet-200">
          שלחו קוד לכל מי שתרצו שיראה את כתובות הבתים בליל האירוע — עד 4
          מכשירים. רוצים לראות בעצמכם? השתמשו באחד הקודים בטלפון הזה. גם בלי
          כרטיס תמשיכו לראות ולעדכן את הבית שלכם.
        </p>
        {!data.enabled ? (
          <p className="text-sm text-amber-200">
            כבוי לציבור — רק מנהלים רואים את זה עכשיו.
          </p>
        ) : null}
      </div>
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <ul className="space-y-2">
        {data.slots.map((slot) => {
          const mine = data.thisDeviceSlot === slot.slot;
          return (
            <li
              key={slot.slot}
              className="space-y-2 rounded-lg bg-[#12081a] p-3 ring-1 ring-orange-500/15"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-violet-400">
                  כרטיס {slot.slot}
                </span>
                <span
                  dir="ltr"
                  className="font-mono text-lg tracking-widest text-orange-100"
                >
                  {slot.code}
                </span>
              </div>
              {slot.status === "active" ? (
                <p className="text-base text-emerald-200">
                  בשימוש · {slot.holderName}
                  {slot.holderPhone ? (
                    <>
                      {" · "}
                      <bdi dir="ltr" className="inline-block text-emerald-300">
                        {slot.holderPhone}
                      </bdi>
                    </>
                  ) : null}
                  {mine ? (
                    <span className="ms-2 text-orange-300">(המכשיר הזה)</span>
                  ) : null}
                  {slot.registrations > 1 ? (
                    <span className="block text-sm text-violet-300">
                      נרשם מחדש במכשיר אחר · {formatWhen(slot.registeredAt)}
                    </span>
                  ) : null}
                </p>
              ) : (
                <p className="text-base text-violet-300">פנוי</p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void share(slot.code)}
                >
                  שליחה
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copy(slot.code)}
                >
                  העתקה
                </Button>
                {slot.status === "unused" && !data.thisDeviceRegistered ? (
                  <Link
                    href={`/pass?c=${slot.code.replace("-", "")}`}
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "border-orange-400/40",
                    )}
                  >
                    להשתמש בטלפון הזה
                  </Link>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busySlot === slot.slot || slot.resetsLeft === 0}
                  onClick={() => void reset(slot)}
                >
                  {busySlot === slot.slot ? "מאפסים…" : "איפוס"}
                </Button>
              </div>
              {slot.resetsLeft != null ? (
                <p className="text-sm text-violet-400">
                  {slot.resetsLeft > 0
                    ? `נשארו ${slot.resetsLeft} איפוסים`
                    : "אין עוד איפוסים — פנו למארגנים"}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
