"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { CodesCopy } from "@/components/codes-copy";
import { HousePicker } from "@/components/house-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { saveOwnedHouse, removeOwnedHouse, forgetPublishedHouse, notifyCatalogChanged } from "@/lib/offline-db";
import { toPublicHouse } from "@/lib/ids";
import type { House, PublicHouse } from "@/lib/types";
import { NightDesk } from "@/components/night-desk";
import { PersistNote } from "@/components/persist-note";
import { readApiJson } from "@/lib/api-json";

export default function EditPage() {
  const owned = useOwnedHouses();
  const { catalog, loading: catalogLoading, refresh } = useCatalog();
  const { admin, ready: adminReady } = useAdminSession();
  const [adminHouses, setAdminHouses] = useState<House[]>([]);
  const [picked, setPicked] = useState<PublicHouse | null>(null);
  const [editCode, setEditCode] = useState("");
  const [house, setHouse] = useState<PublicHouse | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const pickedIdRef = useRef<string | null>(null);
  pickedIdRef.current = picked?.id ?? null;

  useEffect(() => {
    if (!admin) {
      setAdminHouses([]);
      return;
    }
    let cancelled = false;
    void fetch("/api/admin/houses", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { houses?: House[] }) => {
        if (!cancelled) setAdminHouses(data.houses ?? []);
      })
      .catch(() => {
        if (!cancelled) setAdminHouses([]);
      });
    return () => {
      cancelled = true;
    };
  }, [admin]);

  const houses = useMemo(() => {
    const byId = new Map<string, PublicHouse>();
    for (const item of catalog?.houses ?? []) byId.set(item.id, item);
    for (const item of owned) {
      if (item.preview) byId.set(item.id, item.preview);
    }
    if (admin) {
      for (const item of adminHouses) {
        if (item.status === "rejected") continue;
        byId.set(item.id, toPublicHouse(item) as PublicHouse);
      }
    }
    return [...byId.values()];
  }, [admin, adminHouses, catalog?.houses, owned]);

  const ownedMatch = picked ? owned.find((item) => item.id === picked.id) : undefined;
  const adminEditCode = picked && admin ? adminHouses.find((item) => item.id === picked.id)?.editCode : undefined;
  const needsCode = Boolean(picked) && !admin && !ownedMatch && !house;

  useEffect(() => {
    if (prefilled || owned.length === 0 || picked) return;
    const first = houses.find((item) => item.id === owned[0].id) ?? owned[0].preview ?? null;
    if (!first) return;
    setPicked(first);
    setPrefilled(true);
  }, [houses, owned, picked, prefilled]);

  async function unlockWith(
    target: PublicHouse,
    code: string,
    options?: { quiet?: boolean },
  ) {
    setBusy(true);
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(target.id)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode: code }),
      });
      const data = await readApiJson<{ error?: string; house?: PublicHouse }>(res);
      if (pickedIdRef.current !== target.id) return false;
      if (!res.ok || !data.house) {
        if (!options?.quiet) {
          toast.error(data.error ?? "קוד העריכה שגוי. נסו שוב.");
        }
        return false;
      }
      setHouse(data.house);
      saveOwnedHouse({
        id: data.house.id,
        name: data.house.name,
        editCode: code,
        preview: data.house,
      });
      return true;
    } catch {
      if (pickedIdRef.current !== target.id) return false;
      if (!options?.quiet) toast.error("אין קשר לשרת");
      return false;
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    setHouse(null);
    if (!picked) {
      setEditCode("");
      return;
    }
    if (admin) {
      setHouse(picked);
      return;
    }
    const mine = owned.find((item) => item.id === picked.id);
    if (!mine) {
      setEditCode("");
      return;
    }
    const target = picked;
    const code = mine.editCode;
    setEditCode(code);
    setHouse(picked);
    let cancelled = false;
    void unlockWith(target, code, { quiet: true }).then((ok) => {
      if (cancelled || !ok) return;
    });
    return () => {
      cancelled = true;
    };
    // Intentionally only when the chosen house or admin session changes.
    // Saving the house as owned after unlock must not remount the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.id, admin]);

  useEffect(() => {
    if (admin && adminEditCode) setEditCode(adminEditCode);
  }, [admin, adminEditCode]);

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/banner.jpg"
          alt=""
          className="mb-4 h-28 w-full rounded-2xl object-cover ring-1 ring-orange-500/30"
        />
        <h1 className="font-display mb-1 text-2xl text-orange-300">עריכת בית</h1>
        <p className="mb-4 text-base text-violet-200">
          בחרו בית מהרשימה. מנהל או מי שהבית שמור אצלו במכשיר נכנסים ישר לעריכה, בלי קוד.
          מישהו אחר מזין את קוד העריכה שקיבל מי שהוסיף את הבית.
        </p>
        <PersistNote className="mb-4" />
        <div className="mb-4 space-y-3 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
          <div className="space-y-1.5">
            <Label htmlFor="house-pick">בית</Label>
            <HousePicker
              houses={houses}
              selected={picked}
              onSelect={(next) => {
                setPicked(next);
                setHouse(null);
              }}
              ownedIds={owned.map((item) => item.id)}
              loading={catalogLoading || (admin && !adminReady)}
            />
          </div>
          {needsCode ? (
            <div className="space-y-1.5">
              <Label htmlFor="edit-code">קוד עריכה</Label>
              <Input
                id="edit-code"
                value={editCode}
                onChange={(event) => setEditCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6 ספרות"
                className="h-10 bg-[#12081a] tracking-widest"
                maxLength={12}
              />
              <Button
                type="button"
                onClick={() => {
                  if (picked) void unlockWith(picked, editCode.trim());
                }}
                disabled={busy || !picked || !editCode.trim()}
              >
                {busy ? "בודקים…" : "פתיחה לעריכה"}
              </Button>
            </div>
          ) : picked && admin ? (
            <p className="text-base text-emerald-300">מצב מנהל — אפשר לערוך בלי קוד.</p>
          ) : picked && ownedMatch ? (
            <p className="text-base text-emerald-300">הבית שמור במכשיר הזה — נפתח לעריכה.</p>
          ) : null}
        </div>
        {house ? (
          <div className="space-y-3">
            <CodesCopy editCode={admin ? adminEditCode : editCode} />
            <NightDesk
              house={house}
              admin={admin}
              allowDelete
              editCode={admin ? adminEditCode : editCode}
              onDeleted={() => {
                forgetPublishedHouse(house.id);
                removeOwnedHouse(house.id);
                notifyCatalogChanged();
                void refresh(true);
                setHouse(null);
                setPicked(null);
              }}
              onUpdated={(next) => {
                setHouse(next);
                setPicked(next);
                if (!admin && editCode) {
                  saveOwnedHouse({
                    id: next.id,
                    name: next.name,
                    editCode,
                    preview: next,
                  });
                }
              }}
            />
          </div>
        ) : (
          <p className="text-base text-violet-300">
            הבית לא ברשימה?{" "}
            <Link href="/add" className="text-orange-300 underline">
              הוסיפו בית חדש
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}
