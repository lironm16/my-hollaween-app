"use client";

import { useSyncExternalStore } from "react";
import {
  readNightPassState,
  subscribeNightPassState,
  type NightPassState,
} from "@/lib/night-pass-client";

let cachedRaw = "";
let cachedState: NightPassState | null = null;

function snapshot(): NightPassState {
  const next = readNightPassState();
  const raw = JSON.stringify(next);
  if (raw !== cachedRaw || !cachedState) {
    cachedRaw = raw;
    cachedState = next;
  }
  return cachedState;
}

const SERVER_STATE: NightPassState = { enabled: false, viewer: "legacy", registered: false };

/** This device's night-pass status (mirrors `/api/night-passes/me`, refreshed by the catalog). */
export function useNightPass(): NightPassState {
  return useSyncExternalStore(subscribeNightPassState, snapshot, () => SERVER_STATE);
}
