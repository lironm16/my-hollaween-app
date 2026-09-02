import { readApiJson } from "@/lib/api-json";
import type { HouseInput, PublicHouse } from "@/lib/types";

export type PublishResult = {
  house: PublicHouse;
  editCode: string;
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

/** Always posts to the server. Never keeps a house only on the phone. */
export async function publishHouse(input: HouseInput): Promise<PublishResult> {
  const body = readyHouseInput(input);
  let res: Response;
  try {
    res = await fetch("/api/houses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("אין חיבור לשרת. בדקו את הרשת ונסו שוב.");
  }
  const data = await readApiJson<{
    error?: string;
    house?: PublicHouse;
    editCode?: string;
  }>(res);
  if (res.ok && data.house && data.editCode) {
    return { house: data.house, editCode: data.editCode };
  }
  throw new Error(data.error || "לא הצלחנו לשמור את הבית בשרת. נסו שוב.");
}
