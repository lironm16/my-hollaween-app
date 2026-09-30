"use client";

import type { DeviceRole } from "@/lib/types";

export type AccessRegistrationRow = {
  houseId: string;
  houseName: string;
  role: DeviceRole;
  slotsUsed: number;
  slotsMax: number;
};

export type AccessMeResponse = {
  tier: "limited" | "full";
  registrations: AccessRegistrationRow[];
  admin?: boolean;
};

export async function fetchAccessMe(): Promise<AccessMeResponse> {
  const res = await fetch("/api/access/me", { cache: "no-store" });
  if (!res.ok) {
    return { tier: "limited", registrations: [] };
  }
  return res.json() as Promise<AccessMeResponse>;
}

export async function revokeAccessForHouse(houseId: string) {
  const res = await fetch("/api/access/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ houseId }),
  });
  const data = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(data?.error || "לא הצלחנו להסיר.");
}

export type DevicePanel = {
  houseId: string;
  houseName: string;
  slotsUsed: number;
  slotsMax: number;
  devices: Array<{
    id: string;
    role: DeviceRole;
    createdAt: string;
    label?: string;
    isSelf: boolean;
  }>;
  pending: Array<{
    id: string;
    role: DeviceRole;
    expiresAt: string;
    createdAt: string;
  }>;
};

export async function fetchDevicePanel(houseId: string): Promise<DevicePanel | null> {
  const res = await fetch(`/api/access/houses/${encodeURIComponent(houseId)}/devices`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json() as Promise<DevicePanel>;
}

export async function createDeviceInvite(houseId: string, role: DeviceRole) {
  const res = await fetch(`/api/access/houses/${encodeURIComponent(houseId)}/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });
  const data = (await res.json().catch(() => null)) as
    | { error?: string; bindPath?: string; token?: string; expiresAt?: string; role?: DeviceRole }
    | null;
  if (!res.ok) throw new Error(data?.error || "לא הצלחנו ליצור הזמנה.");
  return data!;
}

export async function cancelDeviceInvite(houseId: string, pendingId: string) {
  const res = await fetch(`/api/access/houses/${encodeURIComponent(houseId)}/invite`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pendingId }),
  });
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error || "לא הצלחנו לבטל.");
  }
}

export async function bindDeviceInvite(token: string, houseId: string) {
  const res = await fetch("/api/access/bind", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, houseId }),
  });
  const data = (await res.json().catch(() => null)) as { error?: string; role?: DeviceRole } | null;
  if (!res.ok) throw new Error(data?.error || "לא הצלחנו לרשום.");
  if (data?.role !== "editor" && data?.role !== "visitor") {
    throw new Error("לא הצלחנו לרשום.");
  }
  return { role: data.role };
}

export function roleBadgeLabel(role: DeviceRole) {
  return role === "editor" ? "עורך הבית" : "מבקר";
}
