"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { HouseForm } from "@/components/house-form";
import { CodesCopy } from "@/components/codes-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOwnedHouses } from "@/hooks/use-owned-houses";
import { saveOwnedHouse, notifyCatalogChanged } from "@/lib/offline-db";
import type { HouseInput, PublicHouse } from "@/lib/types";
import { NightDesk } from "@/components/night-desk";
import { PersistNote } from "@/components/persist-note";
import { readApiJson } from "@/lib/api-json";

export default function EditPage() {
  const owned = useOwnedHouses();
  const [id, setId] = useState("");
  const [editCode, setEditCode] = useState("");
  const [house, setHouse] = useState<PublicHouse | null>(null);
  const [busy, setBusy] = useState(false);
  const [filledFromStorage, setFilledFromStorage] = useState(false);

  useEffect(() => {
    if (filledFromStorage || owned.length === 0) return;
    setId(owned[0].id);
    setEditCode(owned[0].editCode);
    setFilledFromStorage(true);
  }, [owned, filledFromStorage]);

  async function unlock() {
    setBusy(true);
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(id)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode }),
      });
      const data = await readApiJson<{ error?: string; house?: PublicHouse }>(res);
      if (!res.ok) {
        const local = owned.find((item) => item.id === id && item.editCode === editCode);
        if (local?.preview) {
          setHouse(local.preview);
          toast.message("השרת לא זוכר את הבית. זה העותק שנשמר בטלפון הזה.");
          return;
        }
        toast.error(data.error ?? "לא הצלחנו לפתוח לעריכה");
        return;
      }
      setHouse(data.house);
      saveOwnedHouse({
        id: data.house.id,
        name: data.house.name,
        editCode,
        preview: data.house,
      });
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(input: HouseInput) {
    if (!house) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(house.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, editCode }),
      });
      const data = await readApiJson<{ error?: string; house?: PublicHouse }>(res);
      if (!res.ok || !data.house) {
        toast.error(data.error ?? "השמירה נכשלה");
        return;
      }
      setHouse(data.house);
      notifyCatalogChanged();
      toast.success("הפרטים עודכנו");
    } catch {
      toast.error("אין קשר לשרת");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppHeader />
      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-5">
        <h1 className="font-display mb-1 text-2xl text-orange-300">עריכת בית</h1>
        <p className="mb-4 text-sm text-violet-200">
          הזינו את מזהה הבית ואת קוד העריכה שקיבלתם אחרי ההרשמה.
        </p>
        <PersistNote className="mb-4" />
        {owned.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {owned.map((h) => (
              <button
                key={h.id}
                type="button"
                className="rounded-full bg-[#1d1028] px-3 py-1 text-xs text-orange-100 ring-1 ring-orange-500/30"
                onClick={() => {
                  setId(h.id);
                  setEditCode(h.editCode);
                }}
              >
                {h.name} · {h.id}
              </button>
            ))}
          </div>
        ) : null}
        <div className="mb-4 space-y-3 rounded-xl bg-[#1d1028] p-3 ring-1 ring-orange-500/20">
          <div className="space-y-1.5">
            <Label>מזהה בית</Label>
            <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="בית-1847" />
          </div>
          <div className="space-y-1.5">
            <Label>קוד עריכה</Label>
            <Input
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              placeholder="6 ספרות"
            />
          </div>
          <Button type="button" onClick={() => void unlock()} disabled={busy || !id || !editCode}>
            פתיחה לעריכה
          </Button>
        </div>
        {house ? (
          <div className="space-y-3">
            <CodesCopy id={house.id} editCode={editCode} />
            <p className="text-sm text-violet-200">
              סטטוס: {statusText(house.status)}
              {house.status === "pending"
                ? " — הבית עדיין לא במפה הציבורית."
                : house.status === "rejected"
                  ? " — אחרי עדכון הבית חוזר למפה."
                  : " — שינויים (מלאי, שעות, הקפאה) נראים לכל השכונה."}
            </p>
            <NightDesk
              house={house}
              editCode={editCode}
              onUpdated={(next) => {
                setHouse(next);
                saveOwnedHouse({
                  id: next.id,
                  name: next.name,
                  editCode,
                  preview: next,
                });
              }}
            />
            <HouseForm
              initial={house}
              submitLabel="שמירת שינויים"
              onSubmit={onSubmit}
              busy={busy}
            />
          </div>
        ) : (
          <p className="text-sm text-violet-300">
            אין קוד?{" "}
            <Link href="/add" className="text-orange-300 underline">
              הוסיפו בית חדש
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}

function statusText(status: PublicHouse["status"]) {
  if (status === "approved") return "מאושר במפה";
  if (status === "rejected") return "נדחה";
  return "ממתין לאישור";
}
