"use client";

import { Copy, KeyRound, Loader2, Share2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  NIGHT_PASSES_SLOTS_CHANGED_EVENT,
  disconnectNightPassOnDevice,
  notifyNightPassSlotsChanged,
  refreshNightPassState,
} from "@/lib/night-pass-client";
import { formatHouseAddedAt } from "@/lib/house-meta";
import { shareHouseAccessInvite } from "@/lib/nav-links";
import type { PublicHouse } from "@/lib/types";

type AccessView = {
  familyCode: string;
  connectedCount: number;
  maxDevices: number;
  devices: {
    sessionId: string;
    holderName: string;
    holderPhone: string;
    registeredAt: string;
    isThisDevice: boolean;
  }[];
  resetCount: number;
};

type PassesResponse = {
  enabled: boolean;
  access: AccessView | null;
  thisDeviceRegistered: boolean;
  error?: string;
};

function PassesSkeleton() {
  return (
    <div className="space-y-3 rounded-xl ring-1 ring-orange-500/20">
      <div className="mx-auto h-8 w-32 animate-pulse rounded-md bg-violet-950/80" />
      <div className="h-20 animate-pulse rounded-xl bg-black/30" />
    </div>
  );
}

function SlotAction({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  icon: ReactNode;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={disabled}
      className="h-9 gap-1.5 border-orange-500/25 bg-[#1d1028] px-2.5 text-orange-100 hover:bg-orange-500/15"
      onClick={onClick}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </Button>
  );
}

/** Owner / admin: family code, devices, invite link. */
export function NightPassesCard({
  houseId,
  house,
  admin,
  embedded = false,
  /** When false, skip the family-code block (shown elsewhere, e.g. edit-code dialog). */
  showFamilyCode = true,
  /** Invite + reset only — for a shared toolbar row with copy. */
  inlineActionsOnly = false,
  /** Hide invite/reset row (list only). */
  hideToolbar = false,
}: {
  houseId: string;
  house?: PublicHouse | null;
  admin: boolean;
  embedded?: boolean;
  showFamilyCode?: boolean;
  inlineActionsOnly?: boolean;
  hideToolbar?: boolean;
}) {
  const [data, setData] = useState<PassesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyReset, setBusyReset] = useState(false);
  const [busyShare, setBusyShare] = useState(false);
  const [busyRemoveId, setBusyRemoveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(houseId)}/night-passes`, {
        cache: "no-store",
      });
      const json = (await res.json().catch(() => null)) as PassesResponse | null;
      if (!res.ok || !json) {
        setError(json?.error ?? "טעינת המכשירים נכשלה.");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("טעינת המכשירים נכשלה.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [houseId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    const onChange = () => {
      setLoading(true);
      void load();
    };
    window.addEventListener(NIGHT_PASSES_SLOTS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(NIGHT_PASSES_SLOTS_CHANGED_EVENT, onChange);
  }, [load]);

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("קוד המשפחה הועתק");
    } catch {
      toast.message(code);
    }
  }

  async function resetFamilyCode() {
    if (
      !window.confirm(
        "ייווצר קוד כניסה חדש. כל המכשירים (כולל שלכם) יצטרכו להתחבר מחדש. להמשיך?",
      )
    ) {
      return;
    }
    setBusyReset(true);
    try {
      const res = await fetch(
        `/api/houses/${encodeURIComponent(houseId)}/night-passes/reset`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
      );
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(json?.error ?? "האיפוס נכשל.");
        return;
      }
      toast.success("קוד הכניסה אופס");
      notifyNightPassSlotsChanged();
      await disconnectNightPassOnDevice();
      await refreshNightPassState({ force: true });
      await load();
    } finally {
      setBusyReset(false);
    }
  }

  async function removeDevice(sessionId: string, isThisDevice: boolean) {
    if (
      !window.confirm(
        isThisDevice
          ? "להסיר את המכשיר הזה מהרשימה? תצטרכו להירשם מחדש כדי לראות כתובות."
          : "להסיר את המכשיר מהרשימה?",
      )
    ) {
      return;
    }
    setBusyRemoveId(sessionId);
    try {
      const res = await fetch(
        `/api/houses/${encodeURIComponent(houseId)}/night-passes/remove`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        },
      );
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(json?.error ?? "ההסרה נכשלה.");
        return;
      }
      if (isThisDevice) {
        await disconnectNightPassOnDevice();
      }
      toast.success("המכשיר הוסר");
      notifyNightPassSlotsChanged();
      await refreshNightPassState({ force: true });
      await load();
    } finally {
      setBusyRemoveId(null);
    }
  }

  async function shareInvite() {
    if (!house) {
      toast.error("לא ניתן לשלוח הזמנה.");
      return;
    }
    setBusyShare(true);
    try {
      const result = await shareHouseAccessInvite(house);
      if (result === "shared") toast.success("ההזמנה נשלחה");
      else if (result === "copied") toast.success("קישור ההזמנה הועתק");
      else if (result === "failed") toast.error("שליחת ההזמנה נכשלה");
    } finally {
      setBusyShare(false);
    }
  }

  if (loading && !data) {
    return (
      <section className={embedded ? "space-y-3" : "mt-4 space-y-3"}>
        <PassesSkeleton />
      </section>
    );
  }

  if (!data) {
    return error ? <p className="text-sm text-red-300">{error}</p> : null;
  }
  if (!data.enabled && !admin) return null;

  const inviteActions = house ? (
    <SlotAction
      label="שלח הזמנה"
      disabled={busyShare}
      onClick={() => void shareInvite()}
      icon={
        busyShare ? (
          <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={2.2} />
        ) : (
          <Share2 className="size-4 shrink-0" strokeWidth={2.2} />
        )
      }
    />
  ) : null;

  if (inlineActionsOnly) {
    return (
      <>
        {inviteActions}
        <SlotAction
          label="איפוס קוד"
          disabled={busyReset}
          onClick={() => void resetFamilyCode()}
          icon={
            busyReset ? (
              <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={2.2} />
            ) : (
              <KeyRound className="size-4 shrink-0" strokeWidth={2.2} />
            )
          }
        />
      </>
    );
  }

  const access = data.access;
  const shellClass = embedded
    ? "space-y-3"
    : "mt-4 space-y-3 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20";

  return (
    <section className={shellClass}>
      {!embedded ? (
        <h2 className="text-center text-lg font-medium text-orange-200">מכשירים והזמנות</h2>
      ) : embedded ? (
        <h3 className="border-t border-orange-500/20 pt-4 text-center text-base font-medium text-orange-200">
          מכשירים והזמנות
        </h3>
      ) : null}
      {!data.enabled ? (
        <p className="text-center text-sm text-amber-200">כבוי לציבור — רק מנהלים רואים עכשיו.</p>
      ) : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      {access ? (
        <>
          <p className="text-center text-sm text-violet-200">
            מכשירים מחוברים: {access.connectedCount}/{access.maxDevices}
          </p>
          {showFamilyCode ? (
            <div className="flex flex-col items-center gap-2 rounded-xl bg-black/30 px-3 py-4 ring-1 ring-orange-500/20">
              <span className="text-sm text-violet-300">קוד כניסה</span>
              <span dir="ltr" className="font-mono text-2xl tracking-[0.35em] text-orange-100">
                {access.familyCode}
              </span>
              <div className="flex flex-wrap justify-center gap-2">
                <SlotAction
                  label="העתק"
                  onClick={() => void copy(access.familyCode.replace(/-/g, ""))}
                  icon={<Copy className="size-4 shrink-0" strokeWidth={2.2} />}
                />
                {inviteActions}
                <SlotAction
                  label="איפוס קוד"
                  disabled={busyReset}
                  onClick={() => void resetFamilyCode()}
                  icon={
                    busyReset ? (
                      <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={2.2} />
                    ) : (
                      <KeyRound className="size-4 shrink-0" strokeWidth={2.2} />
                    )
                  }
                />
              </div>
            </div>
          ) : hideToolbar ? null : (
            <div className="flex flex-wrap justify-center gap-2">
              {inviteActions}
              <SlotAction
                label="איפוס קוד"
                disabled={busyReset}
                onClick={() => void resetFamilyCode()}
                icon={
                  busyReset ? (
                    <Loader2 className="size-4 shrink-0 animate-spin" strokeWidth={2.2} />
                  ) : (
                    <KeyRound className="size-4 shrink-0" strokeWidth={2.2} />
                  )
                }
              />
            </div>
          )}
          <ul className="divide-y divide-orange-500/15 overflow-hidden rounded-xl ring-1 ring-orange-500/20">
            {access.devices.length === 0 ? (
              <li className="px-3 py-4 text-center text-emerald-400">אין מכשירים מחוברים עדיין</li>
            ) : (
              access.devices.map((device) => (
                <li
                  key={device.sessionId}
                  className="flex items-start gap-2 px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-center text-base font-medium text-violet-200">
                      {device.holderName}
                      {" · "}
                      <bdi dir="ltr" className="text-violet-300">
                        {device.holderPhone}
                      </bdi>
                      {device.isThisDevice ? (
                        <span className="text-orange-300"> · המכשיר הזה</span>
                      ) : null}
                    </p>
                    <p className="text-center text-sm text-violet-400">
                      {formatHouseAddedAt(device.registeredAt)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={busyRemoveId === device.sessionId}
                    className="shrink-0 border-red-500/30 text-sm text-red-200 hover:bg-red-950/40"
                    onClick={() => void removeDevice(device.sessionId, device.isThisDevice)}
                  >
                    {busyRemoveId === device.sessionId ? "…" : "הסרה"}
                  </Button>
                </li>
              ))
            )}
            {access.connectedCount < access.maxDevices
              ? Array.from({ length: access.maxDevices - access.connectedCount }).map((_, i) => (
                  <li key={`empty-${i}`} className="px-3 py-2 text-center text-sm text-emerald-400/90">
                    פנוי
                  </li>
                ))
              : null}
          </ul>
        </>
      ) : null}
    </section>
  );
}
