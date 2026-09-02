"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { HouseForm } from "@/components/house-form";
import { HouseMapDynamic } from "@/components/house-map-dynamic";
import { CodesCopy } from "@/components/codes-copy";
import { NightDesk } from "@/components/night-desk";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HouseTags } from "@/components/house-tags";
import { PersistNote } from "@/components/persist-note";
import { statusLabels, houseHeadline } from "@/lib/labels";
import { freezeLabel, isFrozen } from "@/lib/house-state";
import { notifyCatalogChanged } from "@/lib/offline-db";
import type { House, HouseInput, HouseStatus, PublicHouse } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [password, setPassword] = useState("");
  const [houses, setHouses] = useState<House[]>([]);
  const [filter, setFilter] = useState<HouseStatus | "all" | "frozen">("pending");
  const [editing, setEditing] = useState<House | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");

  async function loadHouses() {
    const res = await fetch("/api/admin/houses", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setHouses(data.houses as House[]);
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/session", { cache: "no-store", signal: AbortSignal.timeout(5000) })
      .then((res) => res.json())
      .then(async (data: { admin?: boolean }) => {
        if (cancelled) return;
        setAdmin(Boolean(data.admin));
        setReady(true);
        if (data.admin) await loadHouses();
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function login() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        toast.error("סיסמה שגויה");
        return;
      }
      setAdmin(true);
      setPassword("");
      await loadHouses();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setAdmin(false);
    setHouses([]);
  }

  async function patch(id: string, body: Record<string, unknown>) {
    const res = await fetch(`/api/admin/houses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "העדכון נכשל");
      return;
    }
    toast.success("עודכן");
    notifyCatalogChanged();
    await loadHouses();
    setEditing(null);
  }

  async function saveEdit(input: HouseInput) {
    if (!editing) return;
    setBusy(true);
    try {
      await patch(editing.id, { ...input });
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = houses.filter((h) => h.status === "pending").length;
  const frozenCount = houses.filter((h) => isFrozen(h)).length;
  const visible = useMemo(() => {
    if (filter === "all") return houses;
    if (filter === "frozen") return houses.filter((h) => isFrozen(h));
    return houses.filter((h) => h.status === filter);
  }, [houses, filter]);
  const mapHouses: PublicHouse[] = houses
    .filter((h) => h.status !== "rejected")
    .map(({ editCode, rejectionReason, ...rest }) => {
      void editCode;
      void rejectionReason;
      return rest;
    });

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-orange-200">
        בודקים הרשאות…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader
        actions={
          admin ? (
            <Button size="sm" variant="ghost" onClick={() => void logout()}>
              יציאה
            </Button>
          ) : null
        }
      />
      <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-4 py-5">
        <h1 className="font-display text-2xl text-orange-300">ניהול השכונה</h1>
        {!admin ? (
          <form
            className="mt-6 max-w-sm space-y-3 rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-500/25"
            onSubmit={(e) => {
              e.preventDefault();
              void login();
            }}
          >
            <p className="text-sm text-violet-200">
              רק מנהלים מאשרים בתים חדשים ויכולים לערוך את כולם.
            </p>
            <div className="space-y-1.5">
              <Label>סיסמת מנהל</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" disabled={busy} className="bg-orange-500 text-black">
              כניסה
            </Button>
          </form>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-violet-200">
              {pendingCount} ממתינים · {houses.filter((h) => h.status === "approved").length} מאושרים · {frozenCount} מוקפאים (סיכה שקופה במפה)
            </p>
            <PersistNote />
            <div className="flex flex-wrap gap-2">
              {(["pending", "approved", "rejected", "frozen", "all"] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={
                    filter === key
                      ? "rounded-full bg-orange-500 px-3 py-1 text-xs text-black"
                      : "rounded-full bg-[#1d1028] px-3 py-1 text-xs text-orange-100 ring-1 ring-orange-500/25"
                  }
                >
                  {key === "all" ? "הכל" : key === "frozen" ? "מוקפאים" : statusLabels[key]}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setView(view === "map" ? "list" : "map")}
                className="rounded-full bg-[#1d1028] px-3 py-1 text-xs text-orange-100 ring-1 ring-orange-500/25"
              >
                {view === "map" ? "רשימה" : "מפת מנהל"}
              </button>
              <a href="/api/admin/export" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                הורדת catalog.json
              </a>
              <Button size="sm" variant="ghost" onClick={() => void loadHouses()}>
                רענון
              </Button>
            </div>
            {editing ? (
              <div className="rounded-2xl bg-[#1d1028] p-4 ring-1 ring-orange-400/30">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg text-orange-200">עריכת {editing.name}</h2>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                    ביטול
                  </Button>
                </div>
                <p className="mb-3 font-mono text-xs text-violet-300">
                  {editing.id} · קוד עריכה: {editing.editCode}
                </p>
                <div className="mb-4">
                  <NightDesk
                    admin
                    house={{ ...editing }}
                    editCode={editing.editCode}
                    onUpdated={(next) => {
                      setEditing({ ...editing, ...next, editCode: editing.editCode });
                      void loadHouses();
                    }}
                  />
                </div>
                <HouseForm
                  initial={editing}
                  submitLabel="שמירת מנהל"
                  onSubmit={saveEdit}
                  busy={busy}
                />
              </div>
            ) : null}
            {view === "map" ? (
              <div className="relative z-0 isolate h-[50vh] overflow-hidden rounded-xl ring-1 ring-orange-500/25">
                <HouseMapDynamic
                  houses={mapHouses}
                  onSelect={(h) => {
                    const full = houses.find((x) => x.id === h.id);
                    if (full) setEditing(full);
                  }}
                  className="h-full w-full"
                />
              </div>
            ) : (
              <ul className="space-y-2">
              {visible.length === 0 ? (
                <li className="py-10 text-center text-violet-300">אין בתים בתור הזה.</li>
              ) : (
                visible.map((house) => (
                  <li
                    key={house.id}
                    className={cn(
                      "rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/15",
                      isFrozen(house) && "opacity-70",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-orange-100">
                          {houseHeadline(house)}{" "}
                          <span className="font-mono text-xs text-violet-300">{house.id}</span>
                        </p>
                        <p className="text-sm text-violet-200">{house.address}</p>
                        {house.arrival ? (
                          <p className="text-xs text-amber-200/90">{house.arrival}</p>
                        ) : null}
                        <p className="mt-1 text-xs text-violet-300">{house.description}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="secondary">{statusLabels[house.status]}</Badge>
                          {isFrozen(house) ? (
                            <Badge className="bg-violet-900 text-violet-100">
                              {freezeLabel(house) ?? "מוקפא"}
                            </Badge>
                          ) : null}
                          <HouseTags house={house} />
                        </div>
                        <div className="mt-2">
                          <CodesCopy id={house.id} editCode={house.editCode} />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {house.status !== "approved" ? (
                          <Button
                            size="sm"
                            className="bg-orange-500 text-black"
                            onClick={() => void patch(house.id, { status: "approved" })}
                          >
                            אישור
                          </Button>
                        ) : null}
                        {house.status !== "rejected" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              void patch(house.id, {
                                status: "rejected",
                                rejectionReason: "נדחה על ידי מנהל",
                              })
                            }
                          >
                            דחייה
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            void patch(
                              house.id,
                              isFrozen(house)
                                ? { adminFrozen: false, ownerFrozenUntil: null }
                                : { adminFrozen: true },
                            )
                          }
                        >
                          {isFrozen(house) ? "החזר למפה" : "הקפא"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(house)}>
                          עריכה
                        </Button>
                      </div>
                    </div>
                  </li>
                ))
              )}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
