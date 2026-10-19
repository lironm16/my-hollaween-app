import type { HouseAccessSession } from "@/lib/night-pass-store";

export type HouseAccessRole = "owner" | "editor";

export function normalizeHouseAccessRole(raw: unknown): HouseAccessRole {
  return raw === "owner" ? "owner" : "editor";
}

export function sessionIsOwner(session: Pick<HouseAccessSession, "role"> | null | undefined) {
  return normalizeHouseAccessRole(session?.role) === "owner";
}

export function countOwnerSessions(sessions: readonly HouseAccessSession[]) {
  return sessions.filter((s) => sessionIsOwner(s)).length;
}
