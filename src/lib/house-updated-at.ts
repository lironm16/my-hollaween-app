export function houseUpdatedMs(value?: string | null): number {
  const n = Date.parse(value ?? "");
  return Number.isFinite(n) ? n : 0;
}

export function houseIsAtLeastAsNew(
  incoming: { updatedAt?: string | null },
  current: { updatedAt?: string | null },
): boolean {
  return houseUpdatedMs(incoming.updatedAt) >= houseUpdatedMs(current.updatedAt);
}
