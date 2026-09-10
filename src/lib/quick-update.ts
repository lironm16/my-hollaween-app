import { applyLocalHousePatch } from "@/lib/offline-db";
import { candyLevel, freezeExpireIso, isOwnerFrozen, markedCandy } from "@/lib/house-state";
import { houseHoursWindows, nightStatusControlsEnabled } from "@/lib/hours";
import {
  filledPushForKind,
  resolveHouseNotifyKind,
  type PushKind,
  type StoredPushSettings,
} from "@/lib/push-templates";
import type { PushPayload } from "@/lib/push";
import type { House, HouseInput, PublicHouse, TreatId, VisitState } from "@/lib/types";

export type QuickCandyChoice = "plenty" | "low" | "out";
export type QuickHouseChoice = "open" | "pause" | "closed";

export const QUICK_CANDY_OPTIONS: {
  id: QuickCandyChoice;
  label: string;
  tone?: "default" | "danger";
}[] = [
  { id: "plenty", label: "יש" },
  { id: "low", label: "מעט" },
  { id: "out", label: "נגמר", tone: "danger" },
];

export const QUICK_HOUSE_OPTIONS: {
  id: QuickHouseChoice;
  label: string;
  dotClass: string;
}[] = [
  { id: "open", label: "פתוח", dotClass: "is-open" },
  { id: "pause", label: "הפסקה", dotClass: "is-break" },
  { id: "closed", label: "סגור", dotClass: "is-closed" },
];

export function quickUpdateAvailable(house: PublicHouse, now = new Date()) {
  return nightStatusControlsEnabled(
    {
      openHours: houseHoursWindows(house),
      openFrom: house.openFrom,
      openTo: house.openTo,
    },
    now,
  );
}

export function currentQuickCandy(house: PublicHouse): QuickCandyChoice {
  if (!markedCandy(house)) return "out";
  const level = candyLevel(house);
  if (level === "low") return "low";
  if (level === "out") return "out";
  return "plenty";
}

export function currentQuickHouse(house: PublicHouse): QuickHouseChoice {
  if (house.visit === "closed") return "closed";
  if (isOwnerFrozen(house)) return "pause";
  return "open";
}

export function buildQuickUpdatePatch(
  house: PublicHouse,
  candy: QuickCandyChoice,
  houseStatus: QuickHouseChoice,
): Partial<HouseInput> & { ownerFrozenUntil?: string | null } {
  const withoutCandy = house.treats.filter((id) => id !== "candy");
  const treats = (["candy" as const, ...withoutCandy] as TreatId[]);
  const treatStock = { ...(house.treatStock ?? {}), candy };

  if (houseStatus === "closed") {
    return { treats, treatStock, visit: "closed", ownerFrozenUntil: null };
  }
  if (houseStatus === "pause") {
    const visit: VisitState =
      candy === "plenty" || candy === "low" || candy === "out"
        ? "come"
        : house.decorLevel && house.decorLevel !== "none"
          ? "decorOnly"
          : "come";
    return { treats, treatStock, visit, ownerFrozenUntil: freezeExpireIso() };
  }

  const visit: VisitState =
    candy === "plenty" || candy === "low" || candy === "out"
      ? "come"
      : house.decorLevel && house.decorLevel !== "none"
        ? "decorOnly"
        : "come";
  return { treats, treatStock, visit, ownerFrozenUntil: null };
}

export function quickUpdateChanged(
  house: PublicHouse,
  candy: QuickCandyChoice,
  houseStatus: QuickHouseChoice,
) {
  return candy !== currentQuickCandy(house) || houseStatus !== currentQuickHouse(house);
}

export function previewQuickUpdatePush(
  house: PublicHouse,
  candy: QuickCandyChoice,
  houseStatus: QuickHouseChoice,
  stored?: StoredPushSettings | null,
): { kind: PushKind; payload: PushPayload } | null {
  if (!quickUpdateChanged(house, candy, houseStatus)) return null;
  const patch = buildQuickUpdatePatch(house, candy, houseStatus);
  const next = applyLocalHousePatch(house, patch);
  const kind = resolveHouseNotifyKind(house as House, next as House, patch);
  if (!kind) return null;
  const filled = filledPushForKind(kind, next as House, stored);
  if (!filled) return null;
  return { kind, payload: filled };
}
