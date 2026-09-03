import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { adminRestoreDb } from "@/lib/store";
import { HOUSE_THEMES, DECOR_LEVELS, SCARE_LEVELS, STOCK_LEVELS, TREAT_OPTIONS, VISIT_STATES } from "@/lib/types";

export const runtime = "nodejs";

const houseSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string(),
  theme: z.enum(HOUSE_THEMES).optional(),
  address: z.string(),
  arrival: z.string().optional(),
  description: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  treats: z.array(z.enum(TREAT_OPTIONS)).default([]),
  treatStock: z.record(z.string(), z.enum(STOCK_LEVELS)).optional(),
  visit: z.enum(VISIT_STATES).optional(),
  scareLevel: z.enum(SCARE_LEVELS),
  openFrom: z.string(),
  openTo: z.string(),
  openHours: z
    .array(z.object({ from: z.string(), to: z.string() }))
    .max(6)
    .optional(),
  openFrom2: z.string().optional(),
  openTo2: z.string().optional(),
  notes: z.string().optional(),
  accessible: z.boolean().optional(),
  decorLevel: z.enum(DECOR_LEVELS).optional(),
  decorated: z.boolean().optional(),
  status: z.enum(["pending", "approved", "rejected"]),
  soldOut: z.boolean().optional(),
  adminFrozen: z.boolean().optional(),
  ownerFrozenUntil: z.string().nullable().optional(),
  photoUrl: z.string().optional(),
  editCode: z.string().min(4).max(12),
  createdAt: z.string(),
  updatedAt: z.string(),
  rejectionReason: z.string().optional(),
});

const restoreSchema = z.object({
  updatedAt: z.string(),
  houses: z.array(houseSchema).max(500),
});

export async function POST(request: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "נדרשת הרשאת מנהל." }, { status: 401 });
  }
  const json = await request.json().catch(() => null);
  const parsed = restoreSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "גיבוי לא תקין." }, { status: 400 });
  }
  const db = await adminRestoreDb({
    updatedAt: parsed.data.updatedAt,
    houses: parsed.data.houses.map((house) => ({
      ...house,
      theme: house.theme ?? "pumpkin",
      arrival: house.arrival ?? "",
      description: house.description ?? "",
      notes: house.notes ?? "",
      accessible: Boolean(house.accessible),
      decorLevel: house.decorLevel,
      decorated: house.decorated,
      treatStock: house.treatStock ?? {},
      visit: house.visit ?? "come",
      soldOut: Boolean(house.soldOut),
      adminFrozen: Boolean(house.adminFrozen),
      ownerFrozenUntil: house.ownerFrozenUntil ?? null,
      photoUrl: house.photoUrl ?? "",
    })),
  });
  return NextResponse.json(
    { ok: true, houses: db.houses, updatedAt: db.updatedAt },
    { headers: { "Cache-Control": "no-store" } },
  );
}
