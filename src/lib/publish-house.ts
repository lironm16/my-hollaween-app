import { newEditCode, newPublicId } from "@/lib/ids";
import { readApiJson } from "@/lib/api-json";
import { defaultTreatStock } from "@/lib/house-state";
import type { HouseInput, PublicHouse } from "@/lib/types";

export type PublishResult = {
  house: PublicHouse;
  editCode: string;
  shared: boolean;
};

function clock(value: string) {
  const match = /^(\d{2}:\d{2})/.exec(value.trim());
  return match ? match[1] : "17:00";
}

export function readyHouseInput(input: HouseInput): HouseInput {
  return {
    ...input,
    arrival: input.arrival ?? "",
    description: input.description ?? "",
    notes: input.notes ?? "",
    treats: input.treats ?? [],
    treatStock: input.treatStock ?? {},
    visit: input.visit ?? "come",
    openFrom: clock(input.openFrom),
    openTo: clock(input.openTo),
  };
}

function localPreview(input: HouseInput, id: string): PublicHouse {
  const now = new Date().toISOString();
  const visit = input.visit ?? "come";
  const treats = input.treats ?? [];
  return {
    ...input,
    treats,
    treatStock: { ...defaultTreatStock(treats), ...(input.treatStock ?? {}) },
    visit,
    id,
    status: "pending",
    soldOut: visit === "closed",
    adminFrozen: false,
    ownerFrozenUntil: null,
    photoUrl: "",
    createdAt: now,
    updatedAt: now,
  };
}

export async function publishHouse(input: HouseInput): Promise<PublishResult> {
  const body = readyHouseInput(input);
  try {
    const res = await fetch("/api/houses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await readApiJson<{
      error?: string;
      house?: PublicHouse;
      editCode?: string;
    }>(res);
    if (res.ok && data.house && data.editCode) {
      return { house: data.house, editCode: data.editCode, shared: true };
    }
    if (res.ok === false && res.status >= 400 && res.status < 500) {
      throw new Error(data.error || "השליחה נכשלה");
    }
  } catch (error) {
    if (error instanceof Error && error.message && !/failed to fetch|network|abort/i.test(error.message) && error.name !== "TypeError") {
      throw error;
    }
  }
  const id = newPublicId();
  const editCode = newEditCode();
  return { house: localPreview(body, id), editCode, shared: false };
}
