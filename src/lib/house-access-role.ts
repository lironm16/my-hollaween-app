import type { HouseAccessSession } from "@/lib/night-pass-store";

export type HouseAccessRole = "owner" | "editor";

/** Explicit editor only; missing role = owner (sessions created before roles shipped). */
export function normalizeHouseAccessRole(raw: unknown): HouseAccessRole {
  if (raw === "editor") return "editor";
  return "owner";
}

export function sessionIsOwner(session: Pick<HouseAccessSession, "role"> | null | undefined) {
  return normalizeHouseAccessRole(session?.role) === "owner";
}

export function countOwnerSessions(sessions: readonly HouseAccessSession[]) {
  return sessions.filter((s) => sessionIsOwner(s)).length;
}
