"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { HouseForm } from "@/components/house-form";
import { CodesCopy } from "@/components/codes-copy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadOwnedHouses, saveOwnedHouse } from "@/lib/offline-db";
import type { HouseInput, PublicHouse } from "@/lib/types";

export default function EditPage() {
  const owned = useMemo(() => loadOwnedHouses(), []);
  const [id, setId] = useState(owned[0]?.id ?? "");
  const [editCode, setEditCode] = useState(owned[0]?.editCode ?? "");
  const [house, setHouse] = useState<PublicHouse | null>(null);
  const [soldOut, setSoldOut] = useState(false);
  const [busy, setBusy] = useState(false);

  async function unlock() {
    setBusy(true);
    try {
      const res = await fetch(`/api/houses/${encodeURIComponent(id)}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "לא הצלחנו לפתוח לעריכה");
        return;
      }
      setHouse(data.house);
      setSoldOut(Boolean(data.house.soldOut));
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
        body: JSON.stringify({ ...input, editCode, soldOut }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "השמירה נכשלה");
        return;
      }
      setHouse(data.house);
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
                ? " — שינויים יישמרו, והבית עדיין מחכה לאישור."
                : house.status === "rejected"
                  ? " — אחרי עדכון הבית יישלח שוב לאישור."
                  : ""}
            </p>
            <HouseForm
              initial={house}
              submitLabel="שמירת שינויים"
              onSubmit={onSubmit}
              busy={busy}
              showSoldOut
              soldOut={soldOut}
              onSoldOutChange={setSoldOut}
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
