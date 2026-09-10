"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMergedHouses } from "@/hooks/use-merged-houses";
import Link from "next/link";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { HousePicker } from "@/components/house-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminSession } from "@/hooks/use-admin-session";
import { useCatalog } from "@/hooks/use-catalog";
import { useHouseSet } from "@/hooks/use-house-set";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { houseMatchesSet } from "@/lib/house-set";
import { saveOwnedHouse, removeOwnedHouse, forgetPublishedHouse, notifyCatalogChanged } from "@/lib/offline-db";
import type { House, PublicHouse } from "@/lib/types";
import { HouseEditFlowPanels, useHouseEditFlow } from "@/components/house-edit-flow";
import { Plus } from "lucide-react";
import { PersistNote } from "@/components/persist-note";
import { readApiJson } from "@/lib/api-json";
import { cn } from "@/lib/utils";

export default function EditPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center text-orange-200">טוענים…</div>
      }
    >
      <EditPageContent />
    </Suspense>
  );
}

function EditPageContent() {
  const searchParams = useSearchParams();
  const focusId = searchParams.get("focus");
  const owned = useOwnedHouses();
  const { catalog, loading: catalogLoading, refresh } = useCatalog();
  const { admin, ready: adminReady } = useAdminSession();
  const { houseSet } = useHouseSet();
  const activeHouseSet = admin ? houseSet : "real";
  const [adminHouses, setAdminHouses] = useState<House[]>([]);
  const [picked, setPicked] = useState<PublicHouse | null>(null);
  const [editCode, setEditCode] = useState("");
  const [house, setHouse] = useState<PublicHouse | null>(null);
  const [busy, setBusy] = useState(false);
  const [prefilled, setPrefilled] = useState(false);
  const editFlow = useHouseEditFlow();
  const pickedIdRef = useRef<string | null>(null);
  const autoOpenedIdRef = useRef<string | null>(null);
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

  const merged = useMergedHouses({
    catalogHouses: catalog?.houses ?? [],
    owned,
    admin,
    adminHouses,
    includeCatalogWhenAdmin: true,
  });
  const houses = useMemo(
    () => merged.filter((house) => houseMatchesSet(house, activeHouseSet)),
    [merged, activeHouseSet],
  );

  const ownedMatch = picked ? owned.find((item) => item.id === picked.id) : undefined;
  const adminEditCode = picked && admin ? adminHouses.find((item) => item.id === picked.id)?.editCode : undefined;
  const needsCode = Boolean(picked) && !admin && !ownedMatch && !house;

  useEffect(() => {
    if (!focusId || picked) return;
    const target = houses.find((item) => item.id === focusId);
    if (target) {
      setPicked(target);
      setPrefilled(true);
    }
  }, [focusId, houses, picked]);

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
    autoOpenedIdRef.current = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.id, admin]);

  useEffect(() => {
    if (admin && adminEditCode) setEditCode(adminEditCode);
  }, [admin, adminEditCode]);

  function openHouseEdit(target: PublicHouse) {
    editFlow.openEdit(target, {
      editCode: admin ? adminEditCode : editCode,
      admin,
      allowDelete: true,
    });
  }

  useEffect(() => {
    if (!house || editFlow.flow) return;
    if (autoOpenedIdRef.current === house.id) return;
    autoOpenedIdRef.current = house.id;
    openHouseEdit(house);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [house?.id, editFlow.flow]);

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
        <p className="mb-4 text-base text-violet-200">בחרו בית מהרשימה לעריכה.</p>
        <PersistNote className="mb-4" />

        <section className="mb-4 space-y-3 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
          <div className="space-y-1.5">
            <Label htmlFor="house-pick">איזה בית לערוך?</Label>
            <HousePicker
              houses={houses}
              selected={picked}
              onSelect={(next) => {
                setPicked(next);
                setHouse(null);
                editFlow.close();
              }}
              ownedIds={owned.map((item) => item.id)}
              loading={catalogLoading || (admin && !adminReady)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-orange-500/15 pt-3">
            <Link
              href="/add"
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "inline-flex items-center gap-1.5 border-orange-400/40 text-orange-100",
              )}
            >
              <Plus className="size-4" />
              הוספת בית חדש
            </Link>
            <span className="text-base text-violet-400">או חפשו בית קיים למעלה</span>
          </div>
          {needsCode ? (
            <div className="space-y-1.5 border-t border-orange-500/15 pt-3">
              <Label htmlFor="edit-code">קוד עריכה</Label>
              <p className="text-base text-violet-300">
                מישהו אחר מזין את קוד העריכה שקיבל מי שהוסיף את הבית.
              </p>
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
            <p className="border-t border-orange-500/15 pt-3 text-base text-emerald-300">
              מצב מנהל — אפשר לערוך בלי קוד.
            </p>
          ) : picked && ownedMatch ? (
            <p className="border-t border-orange-500/15 pt-3 text-base text-emerald-300">
              הבית שמור במכשיר הזה — נפתח לעריכה.
            </p>
          ) : null}
        </section>

        {house && !editFlow.flow ? (
          <Button
            type="button"
            className="w-full bg-orange-500 text-black hover:bg-orange-400"
            onClick={() => openHouseEdit(house)}
          >
            עריכת הבית
          </Button>
        ) : !house ? (
          <p className="rounded-xl bg-[#1d1028]/60 px-3 py-4 text-center text-base text-violet-300 ring-1 ring-orange-500/15">
            בחרו בית מהרשימה כדי לערוך, או הוסיפו בית חדש.
          </p>
        ) : null}
      </main>
      <HouseEditFlowPanels
        flow={editFlow.flow}
        setFlow={editFlow.setFlow}
        onClose={editFlow.close}
        onUpdated={(next) => {
          setHouse(next);
          setPicked(next);
          editFlow.setFlow((current) =>
            current?.house.id === next.id ? { ...current, house: next } : current,
          );
          if (!admin && editCode) {
            saveOwnedHouse({
              id: next.id,
              name: next.name,
              editCode,
              preview: next,
            });
          }
          notifyCatalogChanged();
          void refresh(true);
        }}
        onDeleted={(id) => {
          forgetPublishedHouse(id);
          removeOwnedHouse(id);
          notifyCatalogChanged();
          void refresh(true);
          setHouse(null);
          setPicked(null);
          autoOpenedIdRef.current = null;
          editFlow.close();
        }}
      />
    </div>
  );
}
