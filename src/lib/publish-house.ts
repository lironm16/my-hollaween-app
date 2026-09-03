import { readApiJson } from "@/lib/api-json";
import { houseHoursWindows, syncHoursFields } from "@/lib/hours";
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
  const hours = syncHoursFields(
    input.openHours?.length
      ? input.openHours.map((window) => ({
          from: clock(window.from),
          to: clock(window.to),
        }))
      : houseHoursWindows({
          ...input,
          openFrom: clock(input.openFrom),
          openTo: clock(input.openTo),
          openFrom2: input.openFrom2 ? clock(input.openFrom2) : "",
          openTo2: input.openTo2 ? clock(input.openTo2) : "",
        }),
  );
  return {
    ...input,
    arrival: input.arrival ?? "",
    description: input.description ?? "",
    notes: input.notes ?? "",
    treats: input.treats ?? [],
    treatStock: input.treatStock ?? {},
    visit: input.visit ?? "come",
    decorLevel: input.decorLevel,
    decorated: input.decorated,
    ...hours,
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
