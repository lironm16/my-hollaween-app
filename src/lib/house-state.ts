import type { House, PublicHouse, StockLevel, TreatId, TreatStock, VisitState } from "@/lib/types";

export function isOwnerFrozen(house: { ownerFrozenUntil?: string | null }, now = Date.now()) {
  if (!house.ownerFrozenUntil) return false;
  const t = Date.parse(house.ownerFrozenUntil);
  return Number.isFinite(t) && t > now;
}

export function isFrozen(
  house: { adminFrozen?: boolean; ownerFrozenUntil?: string | null },
  now = Date.now(),
) {
  return Boolean(house.adminFrozen) || isOwnerFrozen(house, now);
}

export function isPubliclyListed(house: House | PublicHouse, now = Date.now()) {
  return house.status === "approved" && !isFrozen(house, now);
}

export function effectiveVisit(house: { visit?: VisitState; soldOut?: boolean }): VisitState {
  if (house.visit) return house.visit;
  return house.soldOut ? "closed" : "come";
}

export function defaultTreatStock(treats: TreatId[]): TreatStock {
  const stock: TreatStock = {};
  for (const id of treats) stock[id] = "plenty";
  return stock;
}

export function treatLevel(
  house: { treats: TreatId[]; treatStock?: TreatStock },
  id: TreatId,
): StockLevel {
  if (house.treatStock?.[id]) return house.treatStock[id] as StockLevel;
  return house.treats.includes(id) ? "plenty" : "out";
}

export function markedGlutenFree(house: { treats: TreatId[] }) {
  return house.treats.includes("glutenFree");
}

/** Currently handing out gluten-free (not just marked, and not sold out). */
export function offersGlutenFree(house: { treats: TreatId[]; treatStock?: TreatStock }) {
  return markedGlutenFree(house) && treatLevel(house, "glutenFree") !== "out";
}

export function offersNutsFree(house: { treats: TreatId[]; treatStock?: TreatStock }) {
  return house.treats.includes("nutsFree") && treatLevel(house, "nutsFree") !== "out";
}

export function offersSesameFree(house: { treats: TreatId[]; treatStock?: TreatStock }) {
  return house.treats.includes("sesameFree") && treatLevel(house, "sesameFree") !== "out";
}

export function offersSensitivity(
  house: { treats: TreatId[]; treatStock?: TreatStock },
  id: "glutenFree" | "nutsFree" | "sesameFree",
) {
  if (id === "glutenFree") return offersGlutenFree(house);
  if (id === "nutsFree") return offersNutsFree(house);
  return offersSesameFree(house);
}

export function markedCandy(house: { treats: TreatId[] }) {
  return house.treats.includes("candy");
}

export function candyLevel(house: { treats: TreatId[]; treatStock?: TreatStock }): StockLevel {
  if (house.treatStock?.candy) return house.treatStock.candy as StockLevel;
  if (!house.treats.includes("candy")) return "out";
  return "plenty";
}

/** Currently handing out candy (green or orange). Red / out is filtered out. */
export function offersCandy(house: { treats: TreatId[]; treatStock?: TreatStock }) {
  return candyLevel(house) !== "out";
}

/** Outdoor Halloween decorations you can look at. */
export function isDecorated(house: {
  decorated?: boolean;
  visit?: VisitState;
  soldOut?: boolean;
}) {
  if (house.decorated === false) return false;
  if (house.decorated === true) return true;
  return effectiveVisit(house) !== "closed";
}

export function ownerFreezeUntil(msFromNow: number) {
  return new Date(Date.now() + msFromNow).toISOString();
}

export function tonightAt(hours: number, minutes = 0) {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

/** Freeze until an optional clock time today (rolls to tomorrow if past); omit for until manually cleared. */
export function freezeExpireIso(expireClock?: string | null) {
  const clock = expireClock?.trim() ?? "";
  if (/^\d{2}:\d{2}$/.test(clock)) {
    const hours = Number(clock.slice(0, 2));
    const minutes = Number(clock.slice(3, 5));
    return tonightAt(hours, minutes);
  }
  // Far future — stays frozen until the owner taps unfreeze.
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString();
}

export function freezeLabel(house: { adminFrozen?: boolean; ownerFrozenUntil?: string | null }) {
  if (house.adminFrozen) return "מוקפא על ידי מנהל";
  if (isOwnerFrozen(house)) {
    const t = Date.parse(house.ownerFrozenUntil as string);
    if (!Number.isFinite(t)) return "מוקפא מהמפה";
    const msLeft = t - Date.now();
    if (msLeft > 36 * 60 * 60 * 1000) return "מוקפא מהמפה";
    return `מוקפא עד ${new Date(t).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return null;
}
